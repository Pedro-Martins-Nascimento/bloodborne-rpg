import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import PlayerSheet from '../views/PlayerSheet.vue'
import MasterDashboard from '../views/MasterDashboard.vue'
import SessionSetup from '../views/SessionSetup.vue'
import SessionLobby from '../views/SessionLobby.vue'
import ApprovedLobby from '../views/ApprovedLobby.vue'
import CharacterCreation from '../views/CharacterCreation.vue'

const routes = [
  { path: '/', component: Login },
  { path: '/create', component: CharacterCreation },
  { path: '/player/:id', component: PlayerSheet, props: true },
  { path: '/character/:id', component: PlayerSheet, props: true },
  { path: '/mestre/:sessionId?', component: MasterDashboard, props: true },
  { path: '/sessao', component: SessionSetup },
  { path: '/sessao-lobby/:id/:playerId', component: SessionLobby, props: true },
  { path: '/sessao-approved/:id/:playerId', component: ApprovedLobby, props: true }
]

const router = createRouter({
  // Hash mode é o mais seguro para GitHub Pages
  history: createWebHashHistory(),
  routes
})

export default router