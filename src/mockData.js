export const dashboardStats = {
  metrics: {
    totalBooks: 5840,
    available: 4120,
    borrowed: 1650,
    newThisMonth: 125
  },
  categoriesDistribution: [
    { name: 'Informática', value: 2100 },
    { name: 'Ciencias', value: 1540 },
    { name: 'Literatura', value: 1200 },
    { name: 'Medicina', value: 1000 }
  ],
  statusDistribution: [
    { name: 'Disponibles', cantidad: 4120 },
    { name: 'En Préstamo', cantidad: 1650 }
  ],
  recentBooks: [
    { id: '101', title: 'Cálculo de una variable', author: 'James Stewart', category: 'Ciencias Básicas' },
    { id: '102', title: 'Clean Code', author: 'Robert C. Martin', category: 'Informática' },
    { id: '103', title: 'Anatomía Humana', author: 'Frank H. Netter', category: 'Medicina' }
  ]
};