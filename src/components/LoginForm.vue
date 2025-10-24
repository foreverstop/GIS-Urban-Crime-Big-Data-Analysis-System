<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faUser, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

const account = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showPassword = ref(false) // 新增密码可见状态
const isWechatLoading = ref(false)
const isQQLoading = ref(false)

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  const query = router.currentRoute.value.query
  if (query.registered === 'true') {
    successMessage.value = `账号 ${query.account} 注册成功，请登录`
    account.value = query.account as string || ''
  }
})

const handleLogin = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''

    await authStore.login(
      account.value,
      password.value,
      rememberMe.value
    )

    successMessage.value = '登录成功，即将跳转到首页'
    await router.push({ path: '/' })

  } catch (error: any) {
    errorMessage.value = error.message || '登录过程中发生错误'
  } finally {
    isLoading.value = false
  }
}

// 第三方登录方法
const handleWechatLogin = () => {
  isWechatLoading.value = true
  // 实际开发替换为你的微信登录端点
  window.location.href = 'https://your-api.com/auth/wechat?redirect_uri=' +
    encodeURIComponent(window.location.origin + '/auth/callback')
}

const handleQQLogin = () => {
  isQQLoading.value = true
  // 实际开发替换为你的QQ登录端点
  window.location.href = 'https://your-api.com/auth/qq?redirect_uri=' +
    encodeURIComponent(window.location.origin + '/auth/callback')
}
</script>

<template>
  <div class="login-page">
    <div class="video-background">
      <video src="@/assets/261423_medium.mp4" autoplay loop muted playsinline></video>
    </div>
    <div class="login-container">
      <div class="brand-header">
        <img src="@/assets/logo.png" alt="系统Logo" class="logo">
        <h1 class="system-title">城市犯罪大数据时空分析与预测系统</h1>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <div class="input-group">
          <FontAwesomeIcon :icon="faUser" class="input-icon" />
          <input type="text" v-model="account" placeholder="请输入账号" class="input-field" required
            autocomplete="username" />
        </div>

        <div class="input-group password-group">
          <FontAwesomeIcon :icon="faLock" class="input-icon" />
          <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="请输入密码" class="input-field"
            required autocomplete="current-password" />
          <button type="button" class="toggle-password" @click="showPassword = !showPassword" tabindex="-1">
            <FontAwesomeIcon :icon="showPassword ? faEyeSlash : faEye" />
          </button>
        </div>

        <div class="form-options">
          <div class="remember-me">
            <input type="checkbox" id="remember" v-model="rememberMe" class="checkbox" />
            <label for="remember">记住我</label>
          </div>
          <a href="#" class="forgot-password">忘记密码？</a>
        </div>

        <button type="submit" class="auth-button" :disabled="isLoading">
          {{ isLoading ? '登录中...' : '登录' }}
        </button>

        <div class="social-login">
          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">或使用第三方账号登录</span>
            <span class="divider-line"></span>
          </div>
          
          <div class="social-buttons">
            <button 
              @click="handleWechatLogin" 
              class="social-button wechat"
              :disabled="isWechatLoading"
            >
              <span v-if="isWechatLoading">跳转中...</span>
              <span v-else>
                <img src="@/assets/微信.png" alt="微信" class="social-icon">
                微信登录
              </span>
            </button>
            
            <button 
              @click="handleQQLogin" 
              class="social-button qq"
              :disabled="isQQLoading"
            >
              <span v-if="isQQLoading">跳转中...</span>
              <span v-else>
                <img src="@/assets/qq.png" alt="QQ" class="social-icon">
                QQ登录
              </span>
            </button>
          </div>
        </div>

        <div class="switch-form">
          还没有账号？<router-link to="/register">注册</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* 第三方登录样式 */
.social-login {
  margin: -1.5rem 0;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1.2rem 0;
  color: #a0a4a8;
  font-size: 0.8rem;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: #e0e3e6;
}

.divider-text {
  padding: 0 12px;
  white-space: nowrap;
}

.social-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.social-button {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #e0e3e6;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.social-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.social-button.wechat {
  color: #07C160;
  border-color: #07C160;
}

.social-button.wechat:hover {
  background: rgba(7, 193, 96, 0.05);
}

.social-button.qq {
  color: #12B7F5;
  border-color: #12B7F5;
}

.social-button.qq:hover {
  background: rgba(18, 183, 245, 0.05);
}

.social-icon {
  width: 18px;
  height: 18px;
  margin-right: 8px;
}

/* 新增品牌头部样式 */
.brand-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
  object-fit: contain;
}

/* 新增密码切换按钮样式 */
.password-group {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #a0a4a8;
  font-size: 15px;
  padding: 0 8px;
  z-index: 2;
}

.toggle-password:hover {
  color: #3469CB;
}

/* 调整密码输入框的右侧内边距 */
.password-group .input-field {
  padding-right: 40px;
}

/* 原有其他样式保持不变 */
.success-message {
  color: #2ecc71;
  background-color: #e8f8f0;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
  animation: fadeIn 0.5s;
}

.error-message {
  color: #e74c3c;
  background-color: #fdecea;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- 登录页面背景 (已更新) --- */
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 已移除原有背景图片样式 */
  background: none; /* 关键：移除旧的图片背景 */
  overflow: hidden; /* 防止视频溢出容器 */
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
}

.video-background {
  position: absolute; /* 绝对定位，覆盖整个父容器 */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 隐藏视频裁剪部分 */
  z-index: -1; /* 将视频置于内容下方 */
  /* 可选：添加一个备用图片，以防视频加载失败或在非常旧的浏览器上不兼容 */
  /* background-image: url('/src/assets/登入.jpg'); */
  /* background-size: cover; */
  /* background-position: center; */
}

.video-background video {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 视频覆盖整个容器，并裁剪超出部分 */
  /* 您也可以添加滤镜来提高文字可读性，例如： */
  /* filter: brightness(0.7) grayscale(0.2); */
}

/* --- 登录容器样式确保在视频之上 --- */
.login-container {
  background: rgba(255, 255, 255, 0.65); /* 保持半透明背景 */
  padding: 2.5rem;
  border-radius: 8px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative; /* 确保它创建新的堆叠上下文 */
  z-index: 1; /* 确保在视频 (z-index: -1) 之上 */
}

.system-title {
  font-size: 1.4rem;
  text-align: center;
  margin: 0 0 1.8rem 0;
  line-height: 1.4;
  color: #333;
  font-weight: bold;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.input-group {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #a0a4a8;
  font-size: 15px;
  z-index: 2;
}

.input-field {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #e0e3e6;
  border-radius: 8px;
  font-size: 0.95rem;
  background-color: #f8fafc;
  color: #333;
  transition: all 0.3s;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: #3469CB;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 105, 203, 0.2);
  background-color: #fff;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3469CB;
  margin-right: 6px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin-top: -0.5rem;
}

.remember-me {
  display: flex;
  align-items: center;
}

.forgot-password {
  color: #3469CB;
  text-decoration: none;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.forgot-password:hover {
  text-decoration: underline;
}

.auth-button {
  width: 100%;
  padding: 12px;
  background-color: #3469CB;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 0.5rem;
}

.auth-button:hover {
  background-color: #2a56a7;
}

.switch-form {
  text-align: center;
  margin-top: 0.8rem;
  color: #666;
  font-size: 0.9rem;
}

.switch-form a {
  color: #3469CB;
  cursor: pointer;
  text-decoration: none;
  margin-left: 0.3rem;
  transition: all 0.2s;
}

.switch-form a:hover {
  text-decoration: underline;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .input-field {
    padding: 10px 10px 10px 36px;
  }

  .password-group .input-field {
    padding-right: 36px;
  }

  .input-icon {
    left: 10px;
    font-size: 14px;
  }

  .toggle-password {
    right: 10px;
    font-size: 14px;
  }

  .auth-form {
    gap: 1rem;
  }

  .auth-button {
    padding: 11px;
  }
}
</style>