<script>
		import List from "./components/List.svelte";

		const name = "Mehmet";
</script>

<svelte:head>
<link rel="stylesheet" href="https://bootswatch.com/4/materia/bootstrap.css">
</svelte:head>

<nav class="navbar navbar-light bg-light">
  <a class="navbar-brand" href="/">
    <img src="https://svelte.dev/svelte-logo-horizontal.svg" width="150" height="50" alt="Svelte">
  </a>
</nav>

<div class="container mt-5">
  <List/>
</div>