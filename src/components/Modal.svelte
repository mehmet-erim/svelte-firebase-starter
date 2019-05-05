<script>
	import { onDestroy } from "svelte";
	import { fade } from "svelte/transition";

	export let visible;
	let timeout;

	function close() {
	  timeout = setTimeout(() => (visible = false), 300);
	}

	function open() {
	  visible = true;
	}

	function clear() {
	  setTimeout(() => clearTimeout(timeout), 100);
	}
</script>

{#if visible}
<div class="modal d-block" class:show="{visible}" tabindex="-1" role="dialog" on:click={close}>
	<div class="modal-dialog" role="document">
		<div id="modal" class="modal-content" on:click={clear} transition:fade>
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