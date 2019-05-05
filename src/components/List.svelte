<script>
  import Modal from "./Modal.svelte";

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
    showModal = true;
  }
</script>

<style>
  :global(.text-center) {
    text-align: center;
  }
</style>

<table class="table">
	<thead class="thead-dark">
	<tr>
			<th scope="col">#</th>
			<th scope="col">Name</th>
			<th scope="col">Email</th>
			<th scope="col">Phone</th>
			<th scope="col" class="text-center">
				<img src="https://img.icons8.com/color/26/000000/plus.png" alt="add-customer" on:click={onClickAdd}>
			</th>
		</tr>
	</thead>
	<tbody>
    {#each customers as {id, name, email, phone} (id)}
		<tr>
			<th scope="row">{id}</th>
			<td>{name}</td>
			<td>{email}</td>
			<td>{phone}</td>
			<td class="text-center">
            <button class="btn btn-sm btn-primary">Edit</button> 
            <button class="ml-1 btn btn-sm btn-danger">Remove</button></td>
		</tr>
	{/each}
	</tbody>
</table>

  <Modal bind:visible={showModal}>
	<h3 slot="header">Modal Header</h3>
	Modal Body
  </Modal>
