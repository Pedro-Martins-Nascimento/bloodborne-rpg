import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import PlayerSheet from '../views/PlayerSheet.vue'
import MasterDashboard from '../views/MasterDashboard.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/player/:id', component: PlayerSheet, props: true },
  { path: '/mestre', component: MasterDashboard }
]

const router = createRouter({
  // Hash mode é o mais seguro para GitHub Pages
  history: createWebHashHistory(),
  routes
})

export default router