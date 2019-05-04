
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function toggle_class(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) return;
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = {};
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	/* src/components/Modal.svelte generated by Svelte v3.1.0 */

	const file = "src/components/Modal.svelte";

	function create_fragment(ctx) {
		var div5, div4, div3, div0, h5, t1, button0, span, t3, div1, t5, div2, button1, t7, button2;

		return {
			c: function create() {
				div5 = element("div");
				div4 = element("div");
				div3 = element("div");
				div0 = element("div");
				h5 = element("h5");
				h5.textContent = "Modal title";
				t1 = space();
				button0 = element("button");
				span = element("span");
				span.textContent = "×";
				t3 = space();
				div1 = element("div");
				div1.textContent = "...";
				t5 = space();
				div2 = element("div");
				button1 = element("button");
				button1.textContent = "Close";
				t7 = space();
				button2 = element("button");
				button2.textContent = "Save changes";
				h5.className = "modal-title";
				h5.id = "exampleModalLabel";
				add_location(h5, file, 9, 4, 288);
				attr(span, "aria-hidden", "true");
				add_location(span, file, 11, 5, 438);
				button0.type = "button";
				button0.className = "close";
				button0.dataset.dismiss = "modal";
				attr(button0, "aria-label", "Close");
				add_location(button0, file, 10, 4, 356);
				div0.className = "modal-header";
				add_location(div0, file, 8, 3, 257);
				div1.className = "modal-body";
				add_location(div1, file, 14, 3, 505);
				button1.type = "button";
				button1.className = "btn btn-secondary";
				button1.dataset.dismiss = "modal";
				add_location(button1, file, 18, 4, 582);
				button2.type = "button";
				button2.className = "btn btn-primary";
				add_location(button2, file, 19, 4, 670);
				div2.className = "modal-footer";
				add_location(div2, file, 17, 3, 551);
				div3.className = "modal-content";
				add_location(div3, file, 7, 2, 226);
				div4.className = "modal-dialog";
				attr(div4, "role", "document");
				add_location(div4, file, 6, 1, 181);
				div5.className = "modal fade d-block";
				div5.tabIndex = "-1";
				attr(div5, "role", "dialog");
				attr(div5, "aria-labelledby", "exampleModalLabel");
				attr(div5, "aria-hidden", "true");
				toggle_class(div5, "show", ctx.visible);
				add_location(div5, file, 4, 0, 40);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div4);
				append(div4, div3);
				append(div3, div0);
				append(div0, h5);
				append(div0, t1);
				append(div0, button0);
				append(button0, span);
				append(div3, t3);
				append(div3, div1);
				append(div3, t5);
				append(div3, div2);
				append(div2, button1);
				append(div2, t7);
				append(div2, button2);
			},

			p: function update(changed, ctx) {
				if (changed.visible) {
					toggle_class(div5, "show", ctx.visible);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div5);
				}
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { visible } = $$props;

		$$self.$set = $$props => {
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
		};

		return { visible };
	}

	class Modal extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["visible"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.visible === undefined && !('visible' in props)) {
				console.warn("<Modal> was created without expected prop 'visible'");
			}
		}

		get visible() {
			throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set visible(value) {
			throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/components/List.svelte generated by Svelte v3.1.0 */

	const file$1 = "src/components/List.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.id = list[i].id;
		child_ctx.name = list[i].name;
		child_ctx.email = list[i].email;
		child_ctx.phone = list[i].phone;
		return child_ctx;
	}

	// (35:5) {#each customers as {id, name, email, phone}}
	function create_each_block(ctx) {
		var tr, th, t0_value = ctx.id, t0, t1, td0, t2_value = ctx.name, t2, t3, td1, t4_value = ctx.email, t4, t5, td2, t6_value = ctx.phone, t6, t7, td3, button0, t9, button1;

		return {
			c: function create() {
				tr = element("tr");
				th = element("th");
				t0 = text(t0_value);
				t1 = space();
				td0 = element("td");
				t2 = text(t2_value);
				t3 = space();
				td1 = element("td");
				t4 = text(t4_value);
				t5 = space();
				td2 = element("td");
				t6 = text(t6_value);
				t7 = space();
				td3 = element("td");
				button0 = element("button");
				button0.textContent = "Edit";
				t9 = space();
				button1 = element("button");
				button1.textContent = "Remove";
				th.scope = "row";
				add_location(th, file$1, 36, 3, 676);
				add_location(td0, file$1, 37, 3, 705);
				add_location(td1, file$1, 38, 3, 724);
				add_location(td2, file$1, 39, 3, 744);
				button0.className = "btn btn-sm btn-primary";
				add_location(button0, file$1, 41, 12, 801);
				button1.className = "ml-1 btn btn-sm btn-danger";
				add_location(button1, file$1, 42, 12, 867);
				td3.className = "text-center";
				add_location(td3, file$1, 40, 3, 764);
				add_location(tr, file$1, 35, 2, 668);
			},

			m: function mount(target, anchor) {
				insert(target, tr, anchor);
				append(tr, th);
				append(th, t0);
				append(tr, t1);
				append(tr, td0);
				append(td0, t2);
				append(tr, t3);
				append(tr, td1);
				append(td1, t4);
				append(tr, t5);
				append(tr, td2);
				append(td2, t6);
				append(tr, t7);
				append(tr, td3);
				append(td3, button0);
				append(td3, t9);
				append(td3, button1);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(tr);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		var table, thead, tr, th0, t1, th1, t3, th2, t5, th3, t7, th4, img, t8, tbody, t9, updating_visible, current;

		var each_value = ctx.customers;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		function modal_visible_binding(value) {
			ctx.modal_visible_binding.call(null, value);
			updating_visible = true;
			add_flush_callback(() => updating_visible = false);
		}

		let modal_props = {};
		if (ctx.showModal !== void 0) {
			modal_props.visible = ctx.showModal;
		}
		var modal = new Modal({ props: modal_props, $$inline: true });

		add_binding_callback(() => bind(modal, 'visible', modal_visible_binding));

		return {
			c: function create() {
				table = element("table");
				thead = element("thead");
				tr = element("tr");
				th0 = element("th");
				th0.textContent = "#";
				t1 = space();
				th1 = element("th");
				th1.textContent = "Name";
				t3 = space();
				th2 = element("th");
				th2.textContent = "Email";
				t5 = space();
				th3 = element("th");
				th3.textContent = "Phone";
				t7 = space();
				th4 = element("th");
				img = element("img");
				t8 = space();
				tbody = element("tbody");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t9 = space();
				modal.$$.fragment.c();
				th0.scope = "col";
				add_location(th0, file$1, 24, 3, 344);
				th1.scope = "col";
				add_location(th1, file$1, 25, 3, 370);
				th2.scope = "col";
				add_location(th2, file$1, 26, 3, 399);
				th3.scope = "col";
				add_location(th3, file$1, 27, 3, 429);
				img.src = "https://img.icons8.com/color/26/000000/plus.png";
				img.alt = "add-customer";
				add_location(img, file$1, 29, 4, 500);
				th4.scope = "col";
				th4.className = "text-center";
				add_location(th4, file$1, 28, 3, 459);
				add_location(tr, file$1, 23, 2, 336);
				thead.className = "thead-dark";
				add_location(thead, file$1, 22, 1, 307);
				add_location(tbody, file$1, 33, 1, 607);
				table.className = "table";
				add_location(table, file$1, 21, 0, 284);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, table, anchor);
				append(table, thead);
				append(thead, tr);
				append(tr, th0);
				append(tr, t1);
				append(tr, th1);
				append(tr, t3);
				append(tr, th2);
				append(tr, t5);
				append(tr, th3);
				append(tr, t7);
				append(tr, th4);
				append(th4, img);
				append(table, t8);
				append(table, tbody);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(tbody, null);
				}

				insert(target, t9, anchor);
				mount_component(modal, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.customers) {
					each_value = ctx.customers;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(tbody, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				var modal_changes = {};
				if (!updating_visible && changed.showModal) {
					modal_changes.visible = ctx.showModal;
				}
				modal.$set(modal_changes);
			},

			i: function intro(local) {
				if (current) return;
				modal.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				modal.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(table);
				}

				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(t9);
				}

				modal.$destroy(detaching);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		const customers = [
	    {
	      id: 1,
	      name: "Mark",
	      email: "Otto@markotto.com",
	      phone: "+231323232321"
	    }
	  ];

	  let showModal;

		function modal_visible_binding(value) {
			showModal = value;
			$$invalidate('showModal', showModal);
		}

		return {
			customers,
			showModal,
			modal_visible_binding
		};
	}

	class List extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
		}
	}

	/* src/App.svelte generated by Svelte v3.1.0 */

	const file$2 = "src/App.svelte";

	function create_fragment$2(ctx) {
		var link, t0, nav, a, img, t1, div, current;

		var list = new List({ $$inline: true });

		return {
			c: function create() {
				link = element("link");
				t0 = space();
				nav = element("nav");
				a = element("a");
				img = element("img");
				t1 = space();
				div = element("div");
				list.$$.fragment.c();
				link.rel = "stylesheet";
				link.href = "https://bootswatch.com/4/materia/bootstrap.css";
				add_location(link, file$2, 7, 0, 107);
				img.src = "https://svelte.dev/svelte-logo-horizontal.svg";
				img.width = "150";
				img.height = "50";
				img.alt = "Svelte";
				add_location(img, file$2, 12, 4, 284);
				a.className = "navbar-brand";
				a.href = "/";
				add_location(a, file$2, 11, 2, 246);
				nav.className = "navbar navbar-light bg-light";
				add_location(nav, file$2, 10, 0, 201);
				div.className = "container mt-5";
				add_location(div, file$2, 16, 0, 394);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				append(document.head, link);
				insert(target, t0, anchor);
				insert(target, nav, anchor);
				append(nav, a);
				append(a, img);
				insert(target, t1, anchor);
				insert(target, div, anchor);
				mount_component(list, div, null);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				list.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				list.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				detach(link);

				if (detaching) {
					detach(t0);
					detach(nav);
					detach(t1);
					detach(div);
				}

				list.$destroy();
			}
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$2, safe_not_equal, []);
		}
	}

	var main = new App({
	  target: document.body
	});

	return main;

}());
//# sourceMappingURL=bundle.js.map
