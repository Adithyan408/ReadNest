/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}
let { chartLabels, chartValues, netSales, discountAmount } = window.dashboardData;

if (!chartLabels.length) {
  chartLabels = ['No Data'];
  chartValues = [0];
}

const velocityCtx = document
  .getElementById('monthlySalesChart')
  .getContext('2d');
new Chart(velocityCtx, {
  type: 'bar',
  data: {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        barThickness: 24,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' },
      },
      y: {
        grid: { borderDash: [5, 5], color: '#f1f5f9' },
        ticks: {
          callback: (v) => '₹' + v.toLocaleString(),
          font: { size: 10 },
        },
      },
    },
  },
});

const compositionCtx = document.getElementById('salesDiscountChart').getContext('2d');
new Chart(compositionCtx, {
    type: 'doughnut',
    data: {
        labels: ['Net Sales', 'Discount'],
        datasets: [{
            data: [netSales, discountAmount],
            backgroundColor: ['#4f46e5', '#f43f5e'],
            borderWidth: 0,
            hoverOffset: 10,
        }],
    },
    options: {
        responsive: true, cutout: '75%',
        plugins: { legend: { display: false } },
    },
});
