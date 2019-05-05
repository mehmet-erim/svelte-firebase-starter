<script>
	import { onDestroy } from "svelte";
	import { fade } from "svelte/transition";
	import { fromEvent, Subject } from "rxjs";
	import { filter, takeUntil } from "rxjs/operators";

	export let visible;
	export let center = false;
	export const size = "md";
	export const destroy$ = new Subject();

	let timeout;

	function close() {
	  timeout = setTimeout(() => (visible = false), 300);
	}

	function clear() {
	  setTimeout(() => clearTimeout(timeout), 100);
	}

	onDestroy(() => {
	  destroy$.next();
	  destroy$.complete();
	});

	fromEvent(document, "keyup")
	  .pipe(
	    filter(({ keyCode }) => keyCode === 27),
	    takeUntil(destroy$)
	  )
	  .subscribe(() => (visible = false));
</script>

<style>
	.modal {
	  background-color: rgba(0, 0, 0, 0.4);
	}
</style>

{#if visible}
<div class="modal d-block" class:show="{visible}" tabindex="-1" role="dialog" on:click={close}>
	<div class="modal-dialog modal-{size}" class:modal-dialog-centered="{center}">
		<div class="modal-content" on:click={clear} transition:fade>
			<div class="modal-header">	
				<slot name="header"></slot>
				<button type="button" class="close" on:click={() => visible = false}>
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body">
				<slot></slot>
			</div>
			<div class="modal-footer">
			<slot name="footer">
				<button type="button" class="btn btn-secondary" on:click={close}>Close</button>
			</slot>
			</div>
		</div>
	</div>
</div>
{/if}