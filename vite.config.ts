import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 需要添加的导入

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 添加路径别名解析
      // 确保这些字体图标也能被正确解析
      '@fortawesome/fontawesome-svg-core': path.resolve(
        __dirname,
        'node_modules/@fortawesome/fontawesome-svg-core'
      ),
      '@fortawesome/free-solid-svg-icons': path.resolve(
        __dirname,
        'node_modules/@fortawesome/free-solid-svg-icons'
      ),
      '@fortawesome/vue-fontawesome': path.resolve(
        __dirname,
        'node_modules/@fortawesome/vue-fontawesome'
      )
    }
  },
  optimizeDeps: {
    include: [
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/vue-fontawesome'
    ]
  }
})