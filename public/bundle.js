
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	const identity = x => x;

	function assign(tar, src) {
		for (const k in src) tar[k] = src[k];
		return tar;
	}

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

	function create_slot(definition, ctx, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, fn) {
		return definition[1]
			? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
			: ctx.$$scope.ctx;
	}

	function get_slot_changes(definition, ctx, changed, fn) {
		return definition[1]
			? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
			: ctx.$$scope.changed || {};
	}

	const tasks = new Set();
	let running = false;

	function run_tasks() {
		tasks.forEach(task => {
			if (!task[0](window.performance.now())) {
				tasks.delete(task);
				task[1]();
			}
		});

		running = tasks.size > 0;
		if (running) requestAnimationFrame(run_tasks);
	}

	function loop(fn) {
		let task;

		if (!running) {
			running = true;
			requestAnimationFrame(run_tasks);
		}

		return {
			promise: new Promise(fulfil => {
				tasks.add(task = [fn, fulfil]);
			}),
			abort() {
				tasks.delete(task);
			}
		};
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

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
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

	function custom_event(type, detail) {
		const e = document.createEvent('CustomEvent');
		e.initCustomEvent(type, false, false, detail);
		return e;
	}

	let stylesheet;
	let active = 0;
	let current_rules = {};

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	function hash(str) {
		let hash = 5381;
		let i = str.length;

		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';

		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}

		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;

		if (!current_rules[name]) {
			if (!stylesheet) {
				const style = element('style');
				document.head.appendChild(style);
				stylesheet = style.sheet;
			}

			current_rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}

		const animation = node.style.animation || '';
		node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;

		active += 1;
		return name;
	}

	function delete_rule(node, name) {
		node.style.animation = (node.style.animation || '')
			.split(', ')
			.filter(name
				? anim => anim.indexOf(name) < 0 // remove specific animation
				: anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
			)
			.join(', ');

		if (name && !--active) clear_rules();
	}

	function clear_rules() {
		requestAnimationFrame(() => {
			if (active) return;
			let i = stylesheet.cssRules.length;
			while (i--) stylesheet.deleteRule(i);
			current_rules = {};
		});
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

	let promise;

	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}

		return promise;
	}

	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function create_bidirectional_transition(node, fn, params, intro) {
		let config = fn(node, params);

		let t = intro ? 0 : 1;

		let running_program = null;
		let pending_program = null;
		let animation_name = null;

		function clear_animation() {
			if (animation_name) delete_rule(node, animation_name);
		}

		function init(program, duration) {
			const d = program.b - t;
			duration *= Math.abs(d);

			return {
				a: t,
				b: program.b,
				d,
				duration,
				start: program.start,
				end: program.start + duration,
				group: program.group
			};
		}

		function go(b) {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick: tick$$1 = noop,
				css
			} = config;

			const program = {
				start: window.performance.now() + delay,
				b
			};

			if (!b) {
				program.group = outros;
				outros.remaining += 1;
			}

			if (running_program) {
				pending_program = program;
			} else {
				// if this is an intro, and there's a delay, we need to do
				// an initial tick and/or apply CSS animation immediately
				if (css) {
					clear_animation();
					animation_name = create_rule(node, t, b, duration, delay, easing, css);
				}

				if (b) tick$$1(0, 1);

				running_program = init(program, duration);
				add_render_callback(() => dispatch(node, b, 'start'));

				loop(now => {
					if (pending_program && now > pending_program.start) {
						running_program = init(pending_program, duration);
						pending_program = null;

						dispatch(node, running_program.b, 'start');

						if (css) {
							clear_animation();
							animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
						}
					}

					if (running_program) {
						if (now >= running_program.end) {
							tick$$1(t = running_program.b, 1 - t);
							dispatch(node, running_program.b, 'end');

							if (!pending_program) {
								// we're done
								if (running_program.b) {
									// intro — we can tidy up immediately
									clear_animation();
								} else {
									// outro — needs to be coordinated
									if (!--running_program.group.remaining) run_all(running_program.group.callbacks);
								}
							}

							running_program = null;
						}

						else if (now >= running_program.start) {
							const p = now - running_program.start;
							t = running_program.a + running_program.d * easing(p / running_program.duration);
							tick$$1(t, 1 - t);
						}
					}

					return !!(running_program || pending_program);
				});
			}
		}

		return {
			run(b) {
				if (typeof config === 'function') {
					wait().then(() => {
						config = config();
						go(b);
					});
				} else {
					go(b);
				}
			},

			end() {
				clear_animation();
				running_program = pending_program = null;
			}
		};
	}

	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
		let o = old_blocks.length;
		let n = list.length;

		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;

		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();

		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);

			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				block.p(changed, child_ctx);
			}

			new_lookup.set(key, new_blocks[i] = block);

			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}

		const will_move = new Set();
		const did_move = new Set();

		function insert(block) {
			if (block.i) block.i(1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}

		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;

			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			}

			else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			}

			else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			}

			else if (did_move.has(old_key)) {
				o--;

			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);

			} else {
				will_move.add(old_key);
				o--;
			}
		}

		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}

		while (n) insert(new_blocks[n - 1]);

		return new_blocks;
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

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	function fade(node, {
		delay = 0,
		duration = 400
	}) {
		const o = +getComputedStyle(node).opacity;

		return {
			delay,
			duration,
			css: t => `opacity: ${t * o}`
		};
	}

	/* src/components/Modal.svelte generated by Svelte v3.1.0 */

	const file = "src/components/Modal.svelte";

	const get_footer_slot_changes = ({}) => ({});
	const get_footer_slot_context = ({}) => ({});

	const get_header_slot_changes = ({}) => ({});
	const get_header_slot_context = ({}) => ({});

	// (30:0) {#if visible}
	function create_if_block(ctx) {
		var div5, div4, div3, div0, t0, button0, span, t2, div1, t3, div2, button1, dispose_footer_slot, div3_transition, div4_class_value, current, dispose;

		const header_slot_1 = ctx.$$slots.header;
		const header_slot = create_slot(header_slot_1, ctx, get_header_slot_context);

		const default_slot_1 = ctx.$$slots.default;
		const default_slot = create_slot(default_slot_1, ctx, null);

		const footer_slot_1 = ctx.$$slots.footer;
		const footer_slot = create_slot(footer_slot_1, ctx, get_footer_slot_context);

		return {
			c: function create() {
				div5 = element("div");
				div4 = element("div");
				div3 = element("div");
				div0 = element("div");

				if (header_slot) header_slot.c();
				t0 = space();
				button0 = element("button");
				span = element("span");
				span.textContent = "×";
				t2 = space();
				div1 = element("div");

				if (default_slot) default_slot.c();
				t3 = space();
				div2 = element("div");

				if (!footer_slot) {
					button1 = element("button");
					button1.textContent = "Close";
				}

				if (footer_slot) footer_slot.c();

				attr(span, "aria-hidden", "true");
				add_location(span, file, 36, 5, 851);
				button0.type = "button";
				button0.className = "close";
				add_location(button0, file, 35, 4, 776);
				div0.className = "modal-header svelte-jnk09b";
				add_location(div0, file, 33, 3, 712);

				div1.className = "modal-body svelte-jnk09b";
				add_location(div1, file, 39, 3, 918);

				if (!footer_slot) {
					button1.type = "button";
					button1.className = "btn btn-secondary";
					add_location(button1, file, 44, 4, 1029);
					dispose_footer_slot = listen(button1, "click", ctx.close);
				}

				div2.className = "modal-footer svelte-jnk09b";
				add_location(div2, file, 42, 3, 974);
				div3.className = "modal-content svelte-jnk09b";
				add_location(div3, file, 32, 2, 648);
				div4.className = div4_class_value = "modal-dialog modal-" + ctx.size + " svelte-jnk09b";
				toggle_class(div4, "modal-dialog-centered", ctx.center);
				add_location(div4, file, 31, 1, 567);
				div5.className = "modal d-block svelte-jnk09b";
				div5.tabIndex = "-1";
				attr(div5, "role", "dialog");
				toggle_class(div5, "show", ctx.visible);
				add_location(div5, file, 30, 0, 470);

				dispose = [
					listen(button0, "click", ctx.click_handler),
					listen(div3, "click", ctx.clear),
					listen(div5, "click", ctx.close)
				];
			},

			l: function claim(nodes) {
				if (header_slot) header_slot.l(div0_nodes);

				if (default_slot) default_slot.l(div1_nodes);

				if (footer_slot) footer_slot.l(div2_nodes);
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div4);
				append(div4, div3);
				append(div3, div0);

				if (header_slot) {
					header_slot.m(div0, null);
				}

				append(div0, t0);
				append(div0, button0);
				append(button0, span);
				append(div3, t2);
				append(div3, div1);

				if (default_slot) {
					default_slot.m(div1, null);
				}

				append(div3, t3);
				append(div3, div2);

				if (!footer_slot) {
					append(div2, button1);
				}

				else {
					footer_slot.m(div2, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (header_slot && header_slot.p && changed.$$scope) {
					header_slot.p(get_slot_changes(header_slot_1, ctx, changed, get_header_slot_changes), get_slot_context(header_slot_1, ctx, get_header_slot_context));
				}

				if (default_slot && default_slot.p && changed.$$scope) {
					default_slot.p(get_slot_changes(default_slot_1, ctx, changed,), get_slot_context(default_slot_1, ctx, null));
				}

				if (footer_slot && footer_slot.p && changed.$$scope) {
					footer_slot.p(get_slot_changes(footer_slot_1, ctx, changed, get_footer_slot_changes), get_slot_context(footer_slot_1, ctx, get_footer_slot_context));
				}

				if ((!current || changed.size) && div4_class_value !== (div4_class_value = "modal-dialog modal-" + ctx.size + " svelte-jnk09b")) {
					div4.className = div4_class_value;
				}

				if ((changed.size || changed.center)) {
					toggle_class(div4, "modal-dialog-centered", ctx.center);
				}

				if (changed.visible) {
					toggle_class(div5, "show", ctx.visible);
				}
			},

			i: function intro(local) {
				if (current) return;
				if (header_slot && header_slot.i) header_slot.i(local);
				if (default_slot && default_slot.i) default_slot.i(local);
				if (footer_slot && footer_slot.i) footer_slot.i(local);

				add_render_callback(() => {
					if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, {}, true);
					div3_transition.run(1);
				});

				current = true;
			},

			o: function outro(local) {
				if (header_slot && header_slot.o) header_slot.o(local);
				if (default_slot && default_slot.o) default_slot.o(local);
				if (footer_slot && footer_slot.o) footer_slot.o(local);

				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, {}, false);
				div3_transition.run(0);

				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div5);
				}

				if (header_slot) header_slot.d(detaching);

				if (default_slot) default_slot.d(detaching);

				if (!footer_slot) {
					dispose_footer_slot();
				}

				if (footer_slot) footer_slot.d(detaching);

				if (detaching) {
					if (div3_transition) div3_transition.end();
				}

				run_all(dispose);
			}
		};
	}

	function create_fragment(ctx) {
		var if_block_anchor, current;

		var if_block = (ctx.visible) && create_if_block(ctx);

		return {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.visible) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();
					on_outro(() => {
						if_block.d(1);
						if_block = null;
					});

					if_block.o(1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (if_block) if_block.d(detaching);

				if (detaching) {
					detach(if_block_anchor);
				}
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		

		let { visible, center = false, size = "md" } = $$props;

		let timeout;

		function close() {
		  $$invalidate('timeout', timeout = setTimeout(() => { const $$result = (visible = false); $$invalidate('visible', visible); return $$result; }, 300));
		}

		function clear() {
		  setTimeout(() => clearTimeout(timeout), 100);
		}

		let { $$slots = {}, $$scope } = $$props;

		function click_handler() {
			const $$result = visible = false;
			$$invalidate('visible', visible);
			return $$result;
		}

		$$self.$set = $$props => {
			if ('visible' in $$props) $$invalidate('visible', visible = $$props.visible);
			if ('center' in $$props) $$invalidate('center', center = $$props.center);
			if ('size' in $$props) $$invalidate('size', size = $$props.size);
			if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
		};

		return {
			visible,
			center,
			size,
			close,
			clear,
			click_handler,
			$$slots,
			$$scope
		};
	}

	class Modal extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["visible", "center", "size"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.visible === undefined && !('visible' in props)) {
				console.warn("<Modal> was created without expected prop 'visible'");
			}
			if (ctx.center === undefined && !('center' in props)) {
				console.warn("<Modal> was created without expected prop 'center'");
			}
			if (ctx.size === undefined && !('size' in props)) {
				console.warn("<Modal> was created without expected prop 'size'");
			}
		}

		get visible() {
			throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set visible(value) {
			throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get center() {
			throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set center(value) {
			throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get size() {
			throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set size(value) {
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

	// (39:4) {#each customers as {id, name, email, phone}
	function create_each_block(key_1, ctx) {
		var tr, th, t0_value = ctx.id, t0, t1, td0, t2_value = ctx.name, t2, t3, td1, t4_value = ctx.email, t4, t5, td2, t6_value = ctx.phone, t6, t7, td3, button0, t9, button1;

		return {
			key: key_1,

			first: null,

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
				add_location(th, file$1, 40, 3, 754);
				add_location(td0, file$1, 41, 3, 783);
				add_location(td1, file$1, 42, 3, 802);
				add_location(td2, file$1, 43, 3, 822);
				button0.className = "btn btn-sm btn-primary";
				add_location(button0, file$1, 45, 12, 879);
				button1.className = "ml-1 btn btn-sm btn-danger";
				add_location(button1, file$1, 46, 12, 945);
				td3.className = "text-center";
				add_location(td3, file$1, 44, 3, 842);
				add_location(tr, file$1, 39, 2, 746);
				this.first = tr;
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

	// (54:1) <h3 slot="header">
	function create_header_slot(ctx) {
		var h3;

		return {
			c: function create() {
				h3 = element("h3");
				h3.textContent = "Modal Header";
				attr(h3, "slot", "header");
				add_location(h3, file$1, 53, 1, 1110);
			},

			m: function mount(target, anchor) {
				insert(target, h3, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(h3);
				}
			}
		};
	}

	// (53:2) <Modal bind:visible={showModal} size={'sm'} center="{true}">
	function create_default_slot(ctx) {
		var t;

		return {
			c: function create() {
				t = text("\n\tModal Body");
			},

			m: function mount(target, anchor) {
				insert(target, t, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		var table, thead, tr, th0, t1, th1, t3, th2, t5, th3, t7, th4, img, t8, tbody, each_blocks = [], each_1_lookup = new Map(), t9, updating_visible, current, dispose;

		var each_value = ctx.customers;

		const get_key = ctx => ctx.id;

		for (var i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		function modal_visible_binding(value) {
			ctx.modal_visible_binding.call(null, value);
			updating_visible = true;
			add_flush_callback(() => updating_visible = false);
		}

		let modal_props = {
			size: 'sm',
			center: true,
			$$slots: {
			default: [create_default_slot],
			header: [create_header_slot]
		},
			$$scope: { ctx }
		};
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

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();

				t9 = space();
				modal.$$.fragment.c();
				th0.scope = "col";
				add_location(th0, file$1, 28, 3, 396);
				th1.scope = "col";
				add_location(th1, file$1, 29, 3, 422);
				th2.scope = "col";
				add_location(th2, file$1, 30, 3, 451);
				th3.scope = "col";
				add_location(th3, file$1, 31, 3, 481);
				img.src = "https://img.icons8.com/color/26/000000/plus.png";
				img.alt = "add-customer";
				add_location(img, file$1, 33, 4, 552);
				th4.scope = "col";
				th4.className = "text-center";
				add_location(th4, file$1, 32, 3, 511);
				add_location(tr, file$1, 27, 1, 388);
				thead.className = "thead-dark";
				add_location(thead, file$1, 26, 1, 360);
				add_location(tbody, file$1, 37, 1, 681);
				table.className = "table";
				add_location(table, file$1, 25, 0, 337);
				dispose = listen(img, "click", ctx.onClickAdd);
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

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(tbody, null);

				insert(target, t9, anchor);
				mount_component(modal, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				const each_value = ctx.customers;
				each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, tbody, destroy_block, create_each_block, null, get_each_context);

				var modal_changes = {};
				if (changed.$$scope) modal_changes.$$scope = { changed, ctx };
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

				for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();

				if (detaching) {
					detach(t9);
				}

				modal.$destroy(detaching);

				dispose();
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

	  function onClickAdd() {
	    $$invalidate('showModal', showModal = true);
	  }

		function modal_visible_binding(value) {
			showModal = value;
			$$invalidate('showModal', showModal);
		}

		return {
			customers,
			showModal,
			onClickAdd,
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
