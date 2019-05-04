<script>
		import { fromEvent, Subject } from "rxjs";
		import { takeUntil, filter } from "rxjs/operators";
		import { onDestroy } from "svelte";

		export let visible;

		const destroy$ = new Subject();

		fromEvent(document, "click")
		  .pipe(
		    filter(
		      event =>
		        !!(
		          event &&
		          visible &&
		          !document.querySelector("#modal").contains(event.target)
		        )
		    ),
		    takeUntil(destroy$)
		  )
		  .subscribe(console.warn);

		function close() {
		  visible = false;
		}

		function open() {
		  visible = true;
		}

		onDestroy(() => {
		  destroy$.next();
		  destroy$.complete();
		});
</script>

{#if visible}
<div class="modal fade d-block" class:show="{visible}" tabindex="-1" role="dialog">
	<div class="modal-dialog" role="document">
		<div id="modal" class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title" id="exampleModalLabel">Modal title</h5>
				<button type="button" class="close" on:click={close}>
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				...
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" on:click={close}>Close</button>
				<button type="button" class="btn btn-primary">Save changes</button>
			</div>
		</div>
	</div>
</div>
{/if}