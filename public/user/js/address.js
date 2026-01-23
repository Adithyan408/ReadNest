/* eslint-disable no-unused-vars */

        function openAddAddressModal() { document.getElementById('addAddressModal').classList.replace('hidden', 'flex'); }
        function closeAddAddressModal() { document.getElementById('addAddressModal').classList.replace('flex', 'hidden'); }
        function closeEditAddressModal() { document.getElementById('editAddressModal').classList.replace('flex', 'hidden'); }

        async function saveNewAddress() {
            const body = {
                addressLabel: document.getElementById('addrLabel').value.trim(),
                houseName: document.getElementById('addrHouseName').value.trim(),
                houseNumber: document.getElementById('addrHouseNumber').value.trim(),
                street: document.getElementById('addrStreet').value.trim(),
                post: document.getElementById('addrPost').value.trim(),
                district: document.getElementById('addrDistrict').value.trim(),
                state: document.getElementById('addrState').value.trim(),
                pincode: document.getElementById('addrPincode').value.trim(),
                phone: document.getElementById('addrPhone').value.trim(),
                altPhone: document.getElementById('addrAltPhone').value.trim(),
            };

            if (Object.values(body).some((v, i) => i !== 9 && v === '')) {
                return Swal.fire('Warning', 'All fields are required.', 'warning');
            }

            const res = await fetch('/account/add-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) Swal.fire('Success', 'Address saved!', 'success').then(() => location.reload());
            else Swal.fire('Error', data.message, 'error');
        }

        async function editAddress(id) {
            const res = await fetch(`/account/address/${id}`);
            const data = await res.json();
            if (!data.success) return Swal.fire('Error', data.message, 'error');

            const addr = data.address;
            document.getElementById('editAddrLabel').value = addr.addressLabel;
            document.getElementById('editHouseName').value = addr.houseName;
            document.getElementById('editHouseNumber').value = addr.houseNumber;
            document.getElementById('editStreet').value = addr.street;
            document.getElementById('editPost').value = addr.post;
            document.getElementById('editDistrict').value = addr.district;
            document.getElementById('editState').value = addr.state;
            document.getElementById('editPincode').value = addr.pincode;
            document.getElementById('editPhone').value = addr.phone;
            document.getElementById('editAltPhone').value = addr.altPhone || '';

            window.editingAddressId = id;
            document.getElementById('editAddressModal').classList.replace('hidden', 'flex');
        }

        async function updateAddress(id) {
            const body = {
                addressLabel: document.getElementById('editAddrLabel').value,
                houseName: document.getElementById('editHouseName').value,
                houseNumber: document.getElementById('editHouseNumber').value,
                street: document.getElementById('editStreet').value,
                post: document.getElementById('editPost').value,
                district: document.getElementById('editDistrict').value,
                state: document.getElementById('editState').value,
                pincode: document.getElementById('editPincode').value,
                phone: document.getElementById('editPhone').value,
                altPhone: document.getElementById('editAltPhone').value,
            };

            const res = await fetch(`/account/address/update/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) Swal.fire('Updated!', 'Address saved.', 'success').then(() => location.reload());
            else Swal.fire('Error', data.message, 'error');
        }

        function deleteAddress(id) {
            Swal.fire({
                title: 'Delete Address?',
                text: 'This cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'Yes, delete it',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const res = await fetch(`/account/address/delete/${id}`);
                    const data = await res.json();
                    if (data.success) location.reload();
                    else Swal.fire('Error', data.message, 'error');
                }
            });
        }

        function resetAddressFields() {
            ['addrLabel', 'addrHouseName', 'addrHouseNumber', 'addrStreet', 'addrPost', 'addrDistrict', 'addrState', 'addrPincode', 'addrPhone', 'addrAltPhone']
            .forEach(id => document.getElementById(id).value = '');
        }