<script>
  import Modal from "./Modal.svelte";

  let customers = [
    {
      id: 1,
      name: "Mark",
      email: "Otto@markotto.com",
      phone: "+231323232321"
    }
  ];
  let selectedCustomer = { id: "", name: "", email: "", phone: "" };

  let showModal;
  let isValid = false;

  $: if (
    selectedCustomer.name &&
    selectedCustomer.email &&
    selectedCustomer.phone
  ) {
    isValid = true;
  } else {
    isValid = false;
  }

  function onClickAdd() {
    selectedCustomer = { name: "", email: "", phone: "" };
    showModal = true;
  }

  function onClickEdit(row) {
    selectedCustomer = row;
    showModal = true;
  }

  function save() {
    if (!isValid) {
      return;
    }

    if (!selectedCustomer.id) {
      customers = [
        ...customers,
        { ...selectedCustomer, id: customers[customers.length - 1].id + 1 }
      ];
    } else {
      const index = customers.findIndex(
        customer => customer.id === selectedCustomer.id
      );
      customers[index] = selectedCustomer;
    }

    showModal = false;
  }

  function remove(index) {
    customers = [...customers.slice(0, index), ...customers.slice(index + 1)];
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
    {#each customers as {id, name, email, phone}, i (id)}
		<tr>
			<th scope="row">{id}</th>
			<td>{name}</td>
			<td>{email}</td>
			<td>{phone}</td>
			<td class="text-center">
				<button class="btn btn-sm btn-primary" on:click="{() => onClickEdit({id, name, email, phone})}">Edit</button> 
				<button class="ml-1 btn btn-sm btn-danger" on:click="{() => remove(i)}">Remove</button>
			</td>
		</tr>
	{/each}
	</tbody>
</table>

  <Modal bind:visible={showModal} size={'md'} center="{true}">
	<h3 slot="header">Modal Header</h3>
		<div class="form-group">
			<input type="text" class="form-control" class:is-invalid="{!selectedCustomer.name}" placeholder="Name" bind:value="{selectedCustomer.name}" required>
		</div>
		<div class="form-group">
			<input type="email" class="form-control" class:is-invalid="{!selectedCustomer.email}" placeholder="Email address"  bind:value="{selectedCustomer.email}" required>
		</div>
		<div class="form-group">
			<input type="text" class="form-control" class:is-invalid="{!selectedCustomer.phone}" placeholder="Phone"  bind:value="{selectedCustomer.phone}" required>
		</div>
		<div slot="footer">  
			<button type="submit" class="btn btn-secondary btn-sm" on:click="{() => (showModal = false)}">Cancel</button>
			<button type="submit" class="btn btn-primary btn-sm" disabled="{!isValid}" on:click="{save}">Submit</button>
		</div>
  </Modal>
