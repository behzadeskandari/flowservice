import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './main.css'
import App from './App.vue'
import router from './router'
import Notifications from '@kyvg/vue3-notification'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus, faMoon, faSun, faCamera,  faEdit, faTrash ,faEye,faArrowDown ,faDeleteLeft,faArrowsLeftRight, faExpand,faArrowLeft,faBoxOpen,faArrowRight,faMobileButton} from '@fortawesome/free-solid-svg-icons'
library.add(faPlus, faTrash, faMoon, faSun, faCamera,  faEdit,faEye,faArrowDown,faDeleteLeft,faArrowsLeftRight,faExpand,faArrowLeft,faBoxOpen,faArrowRight ,faMobileButton)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Notifications)
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app')
