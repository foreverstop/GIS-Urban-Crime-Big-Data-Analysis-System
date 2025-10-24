<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
// 导入 Leaflet 库和 Leaflet 的 CSS
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const authStore = useAuthStore();
const router = useRouter();

interface UserInfo {
  account: string;
  email: string;
}

const userInfo = ref<UserInfo>({
  account: '加载中...',
  email: ''
});

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('登出失败:', error);
  }
};

const fetchUserInfo = async () => {
  try {
    const info = await authStore.getUserInfo();
    console.log('用户数据:', info);
    userInfo.value = {
      account: info.account,
      email: info.email
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    router.push({ name: 'login' });
  }
};

// **新的函数：初始化 Leaflet 地图**
const initLeafletMap = () => {
  // 检查地图容器是否存在且没有被Leaflet初始化过
  const mapElement = document.getElementById('leaflet-map');
  if (mapElement && !mapElement._leaflet_id) { // _leaflet_id 是 Leaflet 在初始化时添加的属性
    // 武汉大学遥感信息工程学院的经纬度 (大致坐标)
    const whuRemoteSensingCoords: [number, number] = [30.525923539865946, 114.3602787459024];
    const zoomLevel = 16; // 缩放级别

    const map = L.map('leaflet-map').setView(whuRemoteSensingCoords, zoomLevel);

    // 添加 OpenStreetMap 瓦片图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 添加标记和弹出窗口
    L.marker(whuRemoteSensingCoords).addTo(map)
      .bindPopup("<b>武汉大学遥感信息工程学院</b><br>中国湖北省武汉市")
      .openPopup();
  }
};


onMounted(() => {
  fetchUserInfo();
  // **在组件挂载后初始化 Leaflet 地图**
  initLeafletMap();
});

// 联系方式数据
const contactInfo = ref({
  email: 'info@securityguards.com',
  phone: '+81 03-1234-5678', // 日本示例电话号码
  address: '中国湖北省武汉市武汉大学遥感信息工程学院', // 日本示例地址
  socialMedia: [
    { name: 'Facebook', link: '#' },
    { name: 'Twitter', link: '#' },
    { name: 'LinkedIn', link: '#' }
  ]
});

// 表单数据
const formData = ref({
  name: '',
  email: '',
  message: ''
});

// 处理表单提交
const handleSubmit = () => {
  console.log('提交的表单数据:', formData.value);
  // 在这里可以添加实际的提交逻辑，例如发送到后端 API
};
</script>

<template>
  <div class="adaptive-container">
    <header class="adaptive-header">
      <div class="nav-wrapper">
        <div class="logo-area">
          <img src="@/assets/logo.png" alt="Security Logo" class="logo-img">
          <span class="logo-text">城市犯罪大数据时空分析与预测系统</span>
        </div>
        <nav class="adaptive-nav">
          <router-link to="/" class="nav-item" active-class="active">首页</router-link>
          <router-link to="/crime-map" class="nav-item" active-class="active">犯罪地图</router-link>
          <router-link to="/data-analysis" class="nav-item" active-class="active">数据分析</router-link>
          <router-link to="/crime-prediction" class="nav-item" active-class="active">犯罪预测</router-link>
          <router-link to="/rental-recommendation" class="nav-item" active-class="active">租房推荐</router-link>
          <router-link to="/contact" class="nav-item active" active-class="active">联系我们</router-link>
        </nav>
        <div class="user-area">
          <div class="welcome-message">
            <i class="welcome-icon">👋</i> <span>欢迎{{ userInfo.account }}</span>
          </div>
          <button @click="handleLogout" class="logout-btn">登出</button>
        </div>
      </div>
    </header>

    <main class="adaptive-main">
      <section class="content-section">
        <h1>联系我们</h1>
        <p class="system-subtitle">如果您有任何问题、建议或合作意向，请随时通过以下方式联系我们，或填写下方的联系表格。</p>

        <div class="contact-layout">
          <div class="contact-info">
            <div class="system-note">
              <h3>系统备注</h3>
              <p>本项目为“GIS工程设计与开发”课程的“你说的都队”小组项目，在接受老师的悉心指导和共同商讨下，由“武汉大学遥感信息工程学院地理信息工程系”的同学们开发完成。本系统仅用于城市犯罪大数据时空分析与预测的演示和学习目的，不保证数据的完全准确性和实时性。对于任何依赖本系统信息而产生的后果，本平台不承担任何责任。请谨慎使用相关信息。</p>
            </div>
            <h3>联系信息</h3>
            <ul>
              <li><i class="fa fa-envelope"></i> 邮箱：{{ contactInfo.email }}</li>
              <li><i class="fa fa-phone"></i> 电话：{{ contactInfo.phone }}</li>
              <li><i class="fa fa-map-marker"></i> 地址：{{ contactInfo.address }}</li>
            </ul>
            <div class="social-media">
              <h3>社交媒体</h3>
              <a v-for="social in contactInfo.socialMedia" :key="social.name" :href="social.link"
                target="_blank" class="social-icon">
                <i :class="`fa fa-${social.name.toLowerCase()}`"></i> {{ social.name }}
              </a>
            </div>
          </div>

          <div class="contact-form">
            <h3>发送消息</h3>
            <form @submit.prevent="handleSubmit">
              <div class="form-group">
                <label for="name">姓名:</label>
                <input type="text" id="name" v-model="formData.name" required>
              </div>
              <div class="form-group">
                <label for="email">邮箱:</label>
                <input type="email" id="email" v-model="formData.email" required>
              </div>
              <div class="form-group">
                <label for="message">留言:</label>
                <textarea id="message" v-model="formData.message" rows="5" required></textarea>
              </div>
              <button type="submit" class="submit-btn">发送</button>
            </form>
          </div>

          <div class="contact-map">
            <h3>我们的位置</h3>
            <div id="leaflet-map" class="map-container" style="width: 100%; height: 400px;"></div>
          </div>
        </div>
      </section>
    </main>

    <footer class="adaptive-footer">
      <p>©2025 Security Guards 城市犯罪大数据时空分析与预测系统</p>
    </footer>
  </div>
</template>

<style scoped>
/* 全局变量和基本样式 */
:root {
  --digital-bg-color: #0A1838;
  --digital-primary-color: #00FFFF;
  --digital-secondary-color: #FFA500; /* 橙色作为强调色，与原有的 digital-secondary-color 蓝色区分开 */
  --digital-text-color: #A0B0D0;
  --digital-border-color: #00FFFF;
  --digital-glow-color: #00FFFF;
  --digital-panel-bg: rgba(10, 24, 56, 1);
  --header-height: 80px;
}

/* 重置所有元素的边距和内边距 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 整体容器 */
.adaptive-container {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background-color: var(--digital-bg-color);
  color: var(--digital-text-color);
  font-family: 'Segoe UI', Arial, sans-serif;
  position: relative;
}

/* --- CrimeMapView.vue 风格的导航栏样式 START --- */
.adaptive-header {
  height: var(--header-height);
  background: linear-gradient(to right, rgba(0, 255, 255, 0.1), rgba(0, 255, 255, 0.05), rgba(0, 255, 255, 0.1));
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
}

.nav-wrapper {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.logo-img {
  height: 50px;
  width: auto;
  filter: drop-shadow(0 0 5px var(--digital-primary-color));
}

.logo-text {
  font-size: 24px;
  font-weight: bold;
  color: var(--digital-primary-color);
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  letter-spacing: 2px;
  white-space: nowrap;
}

.adaptive-nav {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin: 0;
}

.nav-item {
  color: var(--digital-text-color);
  font-size: 1.1rem;
  padding: 8px 15px;
  border-radius: 5px;
  transition: all 0.3s ease;
  font-weight: bold;
  white-space: nowrap;
  text-align: center;
  position: relative;
  background-color: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.1);
}

.nav-item:hover {
  background-color: rgba(0, 255, 255, 0.15);
  color: var(--digital-primary-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  transform: translateY(-2px);
}

.nav-item.active {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  box-shadow: 0 0 15px var(--digital-glow-color);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
}

.user-area {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.welcome-message {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--digital-text-color);
  font-size: 1rem;
  white-space: nowrap;
  margin-right: 0;
}

.welcome-icon {
  font-size: 1.1em;
  color: var(--digital-primary-color);
}

.logout-btn {
  padding: 8px 15px;
  font-size: 0.9rem;
  border-radius: 5px;
  cursor: pointer;
  background-color: rgba(0, 255, 255, 0.2);
  color: var(--digital-primary-color);
  border: 1px solid rgba(0, 255, 255, 0.4);
  box-shadow: 0 0 5px rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;
  font-weight: bold;
}

.logout-btn:hover {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  box-shadow: 0 0 15px var(--digital-primary-color);
  transform: translateY(-2px);
}

/* --- CrimeMapView.vue 风格的导航栏样式 END --- */

.adaptive-main {
  flex: 1;
  width: 100%;
  padding: 2rem 0;
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--digital-bg-color);
}

.content-section {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem;
  background: rgba(10, 24, 56, 0.7);
  border-radius: 12px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
  backdrop-filter: blur(5px);
}

h1 {
  color: var(--digital-primary-color);
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
}

.system-subtitle {
  color: var(--digital-text-color);
  line-height: 1.6;
  margin-bottom: 2.5rem;
  text-align: center;
  font-size: 1.1rem;
}

.contact-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: space-around;
  align-items: flex-start;
}

.contact-info {
  width: calc(50% - 1rem);
  min-width: 300px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: rgba(10, 24, 56, 0.5);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.system-note {
  margin-bottom: 1.5rem;
}

.system-note h3 {
  color: var(--digital-primary-color);
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

.system-note p {
  color: var(--digital-text-color);
  line-height: 1.8;
  font-size: 1rem;
}

.contact-info h3 {
  color: var(--digital-primary-color);
  font-size: 1.4rem;
  margin-bottom: 1rem;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

.contact-info ul {
  list-style: none;
  padding: 0;
}

.contact-info li {
  color: var(--digital-text-color);
  line-height: 1.8;
  margin-bottom: 0.5rem;
}

.contact-info i {
  margin-right: 0.5rem;
  color: var(--digital-secondary-color); /* 橙色作为强调色 */
}

.social-media {
  margin-top: 2rem;
}

.social-media h3 {
  color: var(--digital-primary-color);
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

.social-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 1.5rem;
  color: var(--digital-primary-color);
  text-decoration: none;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.social-icon i {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.social-icon:hover {
  color: var(--digital-secondary-color);
  text-shadow: 0 0 8px rgba(255, 165, 0, 0.8);
}

.contact-form {
  width: calc(50% - 1rem);
  min-width: 300px;
  background: rgba(10, 24, 56, 0.5);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.contact-form h3 {
  color: var(--digital-primary-color);
  font-size: 1.4rem;
  margin-bottom: 1rem;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  color: var(--digital-text-color);
  margin-bottom: 0.6rem;
  font-weight: bold;
  font-size: 1rem;
  text-shadow: 0 0 3px rgba(0, 255, 255, 0.3);
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group textarea {
  width: 100%;
  padding: 0.9rem;
  background-color: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 6px;
  font-size: 1rem;
  color: var(--digital-text-color);
  box-shadow: inset 0 0 8px rgba(0, 255, 255, 0.2);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input[type="text"]:focus,
.form-group input[type="email"]:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--digital-primary-color);
  box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.6), 0 0 10px rgba(0, 255, 255, 0.4);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.submit-btn {
  background-color: var(--digital-primary-color);
  color: var(--digital-bg-color);
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  font-weight: bold;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
}

.submit-btn:hover {
  background-color: #00E5E5;
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.9), 0 0 5px rgba(255, 165, 0, 0.5);
  transform: translateY(-2px);
}

.contact-map {
  width: 100%;
  margin-top: 3rem;
  padding: 1.5rem;
  background: rgba(10, 24, 56, 0.7);
  border-radius: 12px;
  border: 1px solid var(--digital-primary-color);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
  backdrop-filter: blur(5px);
}

.contact-map h3 {
  color: var(--digital-primary-color);
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: center;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
}

/* **map-container 现在直接就是 Leaflet 地图容器的样式** */
.map-container {
  width: 100%;
  height: 400px; /* 确保有足够的高度来显示地图 */
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 255, 255, 0.5);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
}

.adaptive-footer {
  width: 100%;
  background: #0E1F4A;
  color: rgba(0, 255, 255, 0.6);
  text-align: center;
  padding: 1.5rem;
  font-size: 0.9rem;
  flex-shrink: 0;
  border-top: 1px solid rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
}

/* 响应式布局调整 */
@media (max-width: 768px) {
  .contact-layout {
    flex-direction: column;
  }

  .contact-info,
  .contact-form {
    width: 100%;
  }

  .content-section {
    padding: 1.5rem;
  }

  h1 {
    font-size: 2rem;
  }

  .system-subtitle {
    font-size: 1rem;
  }

  .contact-map h3 {
    font-size: 1.5rem;
  }
}
</style>