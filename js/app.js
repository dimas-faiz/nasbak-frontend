const API_BASE_URL = "https://nasbak-backend.vercel.app/api";

let state = {
  qtyBiasa: 0,
  qtyPaket: 0,
  priceBiasa: 12000,
  pricePaket: 14000,
  discount: 0,
  voucherCode: "",
  existingStamps: 0,
  hasSpunGacha: false,
  activeOrderId: null, // Menyimpan ID pesanan dari Laravel
};

// Item visual untuk Roda Gacha di Frontend
const gachaRewardsVisual = [
  { title: "Bonus 1 Air Botol", val: 0, color: "#10B981", code: "FREE-AIR" },
  { title: "Diskon Rp 5.000", val: 5000, color: "#0284C7", code: "DISC-5K" },
  { title: "Bonus 1 Air Botol", val: 0, color: "#10B981", code: "FREE-AIR" },
  { title: "Diskon Rp 7.000", val: 7000, color: "#EA580C", code: "DISC-7K" },
];

function drawWheel() {
  const canvas = document.getElementById("wheelCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const numSlices = gachaRewardsVisual.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < numSlices; i++) {
    const angle = i * sliceAngle;
    ctx.beginPath();
    ctx.fillStyle = gachaRewardsVisual[i].color;
    ctx.moveTo(112, 112);
    ctx.arc(112, 112, 110, angle, angle + sliceAngle);
    ctx.lineTo(112, 112);
    ctx.fill();

    ctx.save();
    ctx.translate(112, 112);
    ctx.rotate(angle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(gachaRewardsVisual[i].title, 95, 4);
    ctx.restore();
  }
}

function updateQty(type, amount) {
  if (type === "biasa") {
    state.qtyBiasa = Math.max(0, state.qtyBiasa + amount);
    const el = document.getElementById("qtyBiasa");
    if (el) el.innerText = state.qtyBiasa;
  } else if (type === "paket") {
    state.qtyPaket = Math.max(0, state.qtyPaket + amount);
    const el = document.getElementById("qtyPaket");
    if (el) el.innerText = state.qtyPaket;
  }
  calculateTotals();
}

function calculateTotals() {
  const totalQty = state.qtyBiasa + state.qtyPaket;
  const subtotal =
    state.qtyBiasa * state.priceBiasa + state.qtyPaket * state.pricePaket;
  const totalWithDiscount = Math.max(0, subtotal - state.discount);

  const summaryQty = document.getElementById("summaryQty");
  const summarySubtotal = document.getElementById("summarySubtotal");
  const summaryTotal = document.getElementById("summaryTotal");

  if (summaryQty) summaryQty.innerText = `${totalQty} Porsi`;
  if (summarySubtotal)
    summarySubtotal.innerText = `Rp ${subtotal.toLocaleString("id-ID")}`;
  if (summaryTotal)
    summaryTotal.innerText = `Rp ${totalWithDiscount.toLocaleString("id-ID")}`;

  const discountRow = document.getElementById("discountRow");
  if (discountRow) {
    if (state.discount > 0) {
      discountRow.classList.remove("hidden");
      const summaryDiscount = document.getElementById("summaryDiscount");
      if (summaryDiscount)
        summaryDiscount.innerText = `- Rp ${state.discount.toLocaleString(
          "id-ID"
        )}`;
    } else {
      discountRow.classList.add("hidden");
    }
  }

  const gachaSection = document.getElementById("gachaSection");
  const totalAccumulatedStamps = state.existingStamps + totalQty;

  if (gachaSection) {
    if (totalAccumulatedStamps >= 3 && !state.hasSpunGacha) {
      gachaSection.classList.remove("hidden");
    } else if (!state.hasSpunGacha) {
      gachaSection.classList.add("hidden");
    }
  }

  const stampProgressBar = document.getElementById("stampProgressBar");
  const stampCountText = document.getElementById("stampCountText");
  const stampProgress = (totalAccumulatedStamps % 3) * 33.3;

  if (stampProgressBar)
    stampProgressBar.style.width = `${Math.min(100, stampProgress)}%`;
  if (stampCountText)
    stampCountText.innerText = `${totalAccumulatedStamps % 3} / 3 Stempel`;
}

let isSpinning = false;

// Spin Gacha dipicu dari API Backend Laravel (Hasil murni dari backend)
async function spinGacha() {
  if (isSpinning || state.hasSpunGacha) return;

  if (!state.activeOrderId) {
    alert(
      "Silakan kirim/submit pesanan terlebih dahulu sebelum memutar Gacha!"
    );
    return;
  }

  isSpinning = true;
  const btn = document.getElementById("spinBtn");
  if (btn) {
    btn.disabled = true;
    btn.classList.add("opacity-50");
  }

  try {
    // Tembak API Gacha Backend
    const response = await fetch(`${API_BASE_URL}/gacha/roll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ order_id: state.activeOrderId }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const rewardNameBackend = result.reward; // 'Bonus Air Botol', 'Diskon Rp5.000', atau 'Diskon Rp7.000'

      // Cari index slice roda gacha yang cocok dengan reward backend
      let winningIndex = 0;
      if (rewardNameBackend.includes("5.000")) {
        winningIndex = 1;
      } else if (rewardNameBackend.includes("7.000")) {
        winningIndex = 3;
      } else {
        winningIndex = 0; // Default Air Botol
      }

      // Animasi Roda Putar
      const sliceAngle = 360 / gachaRewardsVisual.length;
      const targetDegrees =
        360 * 5 + (270 - winningIndex * sliceAngle - sliceAngle / 2);

      const canvas = document.getElementById("wheelCanvas");
      if (canvas) {
        canvas.style.transition =
          "transform 4s cubic-bezier(0.15, 0.99, 0.35, 1.0)";
        canvas.style.transform = `rotate(${targetDegrees}deg)`;
      }

      setTimeout(() => {
        const rewardObj = gachaRewardsVisual[winningIndex];
        state.discount = rewardObj.val;
        state.voucherCode = `${rewardObj.code}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;
        state.hasSpunGacha = true;

        const rewardTitle = document.getElementById("rewardTitle");
        const voucherCodeEl = document.getElementById("voucherCode");
        const rewardBox = document.getElementById("rewardBox");

        if (rewardTitle) rewardTitle.innerText = rewardNameBackend;
        if (voucherCodeEl) voucherCodeEl.innerText = state.voucherCode;
        if (rewardBox) rewardBox.classList.remove("hidden");
        if (btn) btn.innerText = "Gacha Berhasil Diklaim!";

        calculateTotals();
        isSpinning = false;
      }, 4000);
    } else {
      alert(result.message || "Gagal memproses gacha.");
      if (btn) btn.disabled = false;
      isSpinning = false;
    }
  } catch (error) {
    console.error("Error spin gacha:", error);
    alert("Terjadi kesalahan koneksi saat memutar gacha.");
    if (btn) btn.disabled = false;
    isSpinning = false;
  }
}

// Submit Order ke API Backend Laravel
async function submitOrder() {
  const custNameEl = document.getElementById("custName");
  const custPhoneEl = document.getElementById("custPhone");

  const name = custNameEl ? custNameEl.value.trim() : "";
  const phone = custPhoneEl ? custPhoneEl.value.trim() : "";
  const totalQty = state.qtyBiasa + state.qtyPaket;

  if (!name || !phone) {
    alert("Mohon isi Nama Lengkap dan Nomor WhatsApp terlebih dahulu.");
    return;
  }

  if (totalQty === 0) {
    alert("Mohon pilih setidaknya 1 porsi Nasi Bakar.");
    return;
  }

  // Tentukan item menu utama yang dipesan
  let menuItem = "Nasi Bakar Biasa";
  if (state.qtyPaket > 0 && state.qtyBiasa === 0) {
    menuItem = "Paket Nasi Bakar + Air";
  } else if (state.qtyPaket > 0 && state.qtyBiasa > 0) {
    menuItem = "Paket Nasi Bakar + Air"; // Menggunakan varian paket jika ada variasi
  }

  const payload = {
    customer_name: name,
    customer_phone: phone,
    menu_item: menuItem,
    qty: totalQty,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      state.activeOrderId = result.data.id; // Simpan ID order dari Laravel

      alert(
        `Terima kasih ${name}! Pesanan kamu berhasil dikirim ke sistem. Total: Rp ${parseInt(
          result.data.total_price
        ).toLocaleString("id-ID")}`
      );

      // Jika pesanan kelipatan 3 porsi dan belum spin, otomatis panggil gacha
      if (totalQty >= 3 && !state.hasSpunGacha) {
        const gachaSection = document.getElementById("gachaSection");
        if (gachaSection) gachaSection.classList.remove("hidden");
        alert("🎉 Selamat! Kamu mendapatkan 1x kesempatan Spin Gacha Loyalty!");
      }
    } else {
      alert(`Gagal membuat pesanan: ${result.message || "Terjadi kesalahan"}`);
    }
  } catch (error) {
    console.error("Error submit order:", error);
    alert("Gagal terhubung ke server backend.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  drawWheel();

  const phoneInput = document.getElementById("custPhone");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const stampCard = document.getElementById("stampCard");
      if (stampCard) {
        if (val.length >= 10) {
          stampCard.classList.remove("hidden");
          calculateTotals();
        } else {
          stampCard.classList.add("hidden");
        }
      }
    });
  }
});
