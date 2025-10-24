<template>
  <div class="adaptive-container">
    <!-- 顶部导航栏 -->
    <header class="adaptive-header">
      <div class="nav-wrapper">
        <div class="logo-area">
          <img src="@/assets/logo.png" alt="Security Logo" class="logo-img" />
          <span class="logo-text">城市犯罪大数据时空分析与预测系统</span>
        </div>

        <nav class="adaptive-nav">
          <router-link to="/" class="nav-item active">首页</router-link>
          <router-link to="/crime-map" class="nav-item">犯罪地图</router-link>
          <router-link to="/data-analysis" class="nav-item">数据分析</router-link>
          <router-link to="/crime-prediction" class="nav-item">犯罪预测</router-link>
          <router-link to="/rental-recommendation" class="nav-item">租房推荐</router-link>
          <router-link to="/contact" class="nav-item">联系我们</router-link>
        </nav>

        <div class="user-area">
          <div class="welcome-message">
            <i class="welcome-icon">👋</i>
            <span>欢迎{{ userInfo.account }}</span>
          </div>
          <button class="logout-btn" @click="handleLogout">登出</button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="adaptive-main">
      <section class="hero">
        <video class="bg-video" autoplay muted loop playsinline>
          <source src="../data/crossroad_day.mp4" />
        </video>
        <div class="bg-overlay"></div>
        <div class="hero-content">
          <h1 class="system-title">城市犯罪大数据时空分析与预测系统</h1>
          <p class="system-subtitle">基于数据分析与挖掘技术的智能安全预警平台</p>
        </div>
      </section>

      <!-- 图片轮播 -->
      <section class="content-section">
        <div class="slider-wrapper">
          <div class="slider" ref="slider">
            <div class="slide-track" ref="slideTrack">
              <div class="slide" @click="openLink(0)"><img src="../data/images/congressional_baseball_shooting.jpg"
                  style="cursor: pointer;" alt="image1" /></div>
              <div class="slide" @click="openLink(1)"><img src="../data/images/attack_on_the_u_s_capitol.jpg"
                  style="cursor: pointer;" alt="image2" /></div>
              <div class="slide" @click="openLink(2)"><img src="../data/images/baseball.jpg" style="cursor: pointer;"
                  alt="image3" /></div>
              <div class="slide" @click="openLink(3)"><img src="../data/images/carattack.jpg" style="cursor: pointer;"
                  alt="image4" /></div>
            </div>
            <span class="prev" @click="moveSlide(-1)">&#10094;</span>
            <span class="next" @click="moveSlide(1)">&#10095;</span>
            <div class="indicators" ref="indicators"></div>
          </div>

          <div class="slide-desc">
            <h3 class="desc-title">{{ descriptions[currentIndex].title }}</h3>
            <p class="desc-text">{{ descriptions[currentIndex].text }}</p>
          </div>
        </div>
      </section>
      <section class="info-banner" :class="{ reverse: bannerImgRight }">
        <!-- 图片 -->
        <img class="banner-img" src="../data/images/logo.png" alt="示例图片" />

        <!-- 文字 -->
        <div class="banner-text">
          <h2 class="banner-title">为什么选择我们？</h2>
          <p class="banner-desc">
            城市犯罪大数据时空分析与预测系统致力于打造一个围绕华盛顿地区的犯罪数据可视化统计平台，通过结合<b>多源地理数据</b>联合分析，得出与安全性评估有关的结论。
            <br>数据来源真实可靠，同时也是<b>操作便捷、注重用户体验</b>的研究分析平台。
          </p>
        </div>
      </section>

      <section class="card-carousel">
        <button class="nav-btn left" @click="prevCard"> < </button>

        <div class="carousel-clip">

          <div class="card-viewport">
            <!-- 轨道：所有卡片一字排开，translateX 控制 -->
            <div class="card-track" :style="{
              transform: `translateX(-${activeIdx * (cardWidth + gap)
                }px)`
            }">
              <component v-for="c in cards" :key="c.id" :is="c.to ? 'router-link' : 'a'" class="card" :to="c.to"
                target='_self' rel="noopener">
                <img :src="c.img" class="card-img" />

                <div class="card-text">
                  <h3>{{ c.title }}</h3>
                  <p>{{ c.desc }}</p>
                </div>
              </component>
            </div>
          </div>

        </div>

        <!-- 左右按钮 -->
        <button class="nav-btn right" @click="nextCard"> > </button>

      </section>
    </main>

    <footer class="adaptive-footer">
      <p>©2025 Security Guards 城市犯罪大数据时空分析与预测系统</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useHomeView } from './HomeView'

const {
  userInfo,
  handleLogout,
  slider, slideTrack, indicators,
  currentIndex,
  descriptions,
  bannerImgRight,
  cards,
  activeIdx,
  cardWidth,
  gap,
  openLink,
  moveSlide,
  prevCard,
  nextCard
} = useHomeView()

</script>

<style scoped src="./HomeView.css"></style>
