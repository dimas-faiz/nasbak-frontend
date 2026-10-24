const API_BASE_URL = 'https://nasbak-backend.vercel.app/api';
let allOrders = [];
let currentFilter = 'all';

// Pengecekan Autentikasi Session
const userSession = JSON.parse(localStorage.getItem('user_session'));
if (!userSession) {
    window.location.href = 'login.html'; // Tendang ke login jika belum login
}

async function fetchOrders() {
    const tableBody = document.getElementById('orderTableBody');
    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        const result = await response.json();

        if (response.ok && result.success) {
            allOrders = result.data;
            updateSummaryCards(allOrders);
            renderOrders();
        } else {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal mengambil data pesanan.</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal terhubung ke API Laravel.</td></tr>`;
    }
}

function updateSummaryCards(orders) {
    let totalOmzet = 0;
    let pendingCount = 0;

    orders.forEach(order => {
        if (order.status === 'paid' || order.status === 'completed') {
            totalOmzet += parseFloat(order.total_price);
        }
        if (order.status === 'pending') {
            pendingCount++;
        }
    });

    document.getElementById('statTotalOmzet').innerText = `Rp ${totalOmzet.toLocaleString('id-ID')}`;
    document.getElementById('statTotalOrders').innerText = orders.length;
    document.getElementById('statPendingOrders').innerText = pendingCount;
}

function renderOrders() {
    const tableBody = document.getElementById('orderTableBody');
    const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();

    let filtered = allOrders.filter(order => {
        const matchesStatus = (currentFilter === 'all') || (order.status === currentFilter);
        const matchesSearch = order.customer_name.toLowerCase().includes(searchVal) || 
                              order.customer_phone.includes(searchVal);
        return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted-green">Tidak ada data pesanan ditemukan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map(order => {
        const totalFormatted = `Rp ${parseInt(order.total_price).toLocaleString('id-ID')}`;
        
        let rewardBadge = `<span class="text-muted-green">-</span>`;
        if (order.gacha_reward) {
            rewardBadge = `<span class="badge-table success"><i class="bi bi-gift-fill me-1"></i>${order.gacha_reward.reward_name}</span>`;
        }

        let statusBadge = '';
        if (order.status === 'pending') {
            statusBadge = `<span class="badge-table pending">Pending</span>`;
        } else if (order.status === 'paid') {
            statusBadge = `<span class="badge-table success">Lunas</span>`;
        } else {
            statusBadge = `<span class="badge-table success">Selesai</span>`;
        }

        let actionBtn = '';
        if (order.status === 'pending') {
            actionBtn = `
                <button onclick="updateStatus(${order.id}, 'paid')" class="btn-custom btn-custom-sm btn-custom-primary">
                    <i class="bi bi-check-circle"></i> Tandai Lunas
                </button>
            `;
        } else if (order.status === 'paid') {
            actionBtn = `
                <button onclick="updateStatus(${order.id}, 'completed')" class="btn-custom btn-custom-sm btn-custom-secondary">
                    <i class="bi bi-check2-all"></i> Selesaikan
                </button>
            `;
        } else {
            actionBtn = `<span class="text-muted-green fs-xs italic"><i class="bi bi-check-all text-success"></i> Selesai</span>`;
        }

        return `
            <tr>
                <td class="table-order-id">#${order.id}</td>
                <td>
                    <div class="table-user-name">${order.customer_name}</div>
                    <div class="table-user-sub"><i class="bi bi-whatsapp text-success me-1"></i>${order.customer_phone}</div>
                </td>
                <td>
                    <div class="table-product-name">${order.menu_item}</div>
                    <div class="table-user-sub">${order.qty} Porsi</div>
                </td>
                <td class="table-amount">${totalFormatted}</td>
                <td>${rewardBadge}</td>
                <td>${statusBadge}</td>
                <td class="text-center">${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

async function updateStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            fetchOrders();
        } else {
            alert('Gagal mengupdate status pesanan.');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Terjadi kesalahan koneksi.');
    }
}

function filterOrders() {
    renderOrders();
}

function setFilter(status) {
    currentFilter = status;
    renderOrders();
}

function handleLogout() {
    localStorage.removeItem('user_session');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Tampilkan Nama & Role di Dashboard Kasir
    if (userSession) {
        const nameEl = document.getElementById('sessionName');
        const roleEl = document.getElementById('sessionRole');
        if (nameEl) nameEl.innerText = userSession.name;
        if (roleEl) roleEl.innerText = userSession.role === 'admin' ? 'Super Admin' : 'Kasir Staf';
    }

    fetchOrders();
    setInterval(fetchOrders, 10000);

    const desktopToggleBtn = document.querySelector('#desktop-sidebar-toggle');
    if (desktopToggleBtn) {
        desktopToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-minimized');
        });
    }
});