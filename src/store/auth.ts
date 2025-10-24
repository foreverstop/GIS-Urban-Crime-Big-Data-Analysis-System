import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AxiosError } from 'axios'
import api from '@/utils/api'

interface AuthResponse {
  token: string
  account: string
  email: string
  id?: number
}

interface UserInfo {
  account: string
  email: string
  id?: number
}

interface RegisterResponse {
  account: string
  email: string
  id?: number
}

interface ErrorResponse {
  message?: string
}

export const useAuthStore = defineStore('auth', () => {
  // 修改点1：使用UserInfo类型存储完整用户数据
  const user = ref<UserInfo | null>(null)
  const token = ref<string | null>(localStorage.getItem('authToken') || null)
  
  // 新增：初始化时尝试恢复用户状态
  const initialize = async () => {
    if (token.value && !user.value) {
      try {
        await getUserInfo()
      } catch {
        logout()
      }
    }
  }

  const register = async (
    account: string, 
    email: string, 
    password: string
  ): Promise<RegisterResponse> => {
    console.group('[AuthStore] 用户注册')
    try {
      const response = await api.post<RegisterResponse>('/register', {
        account,
        email,
        password
      })
      console.log('注册成功，返回用户数据')
      return response.data
    } catch (error) {
      const err = error as AxiosError<ErrorResponse>
      console.error('注册请求错误:', err)
      throw new Error(
        err.response?.data?.message || 
        '注册失败，请重试'
      )
    } finally {
      console.groupEnd()
    }
  }

  const login = async (
    account: string, 
    password: string, 
    rememberMe: boolean
  ): Promise<void> => {
    console.group('[AuthStore] 用户登录')
    try {
      const response = await api.post<AuthResponse>('/login', {
        account,
        password
      })

      // 修改点2：登录时同步存储完整用户信息
      token.value = response.data.token
      user.value = {
        account: response.data.account,
        email: response.data.email,
        id: response.data.id
      }

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('authToken', token.value)
      console.log('登录成功，用户信息已更新')
    } catch (error) {
      const err = error as AxiosError<ErrorResponse>
      console.error('登录请求错误:', err)
      throw new Error(
        err.response?.data?.message || 
        '登录失败，请检查凭证'
      )
    } finally {
      console.groupEnd()
    }
  }

  const getUserInfo = async (): Promise<UserInfo> => {
    console.group('[AuthStore] 获取用户信息')
    try {
      if (!token.value) throw new Error('无有效token')

      // 修改点3：优先返回已缓存的用户信息
      if (user.value) {
        console.log('使用缓存的用户信息')
        return user.value
      }

      const response = await api.get<UserInfo>('/user/info', {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      
      user.value = response.data
      console.log('获取到最新用户信息:', response.data)
      return response.data
    } catch (error) {
      const err = error as AxiosError<ErrorResponse>
      console.error('获取用户信息失败:', err)
      throw new Error(
        err.response?.data?.message || 
        '获取用户信息失败'
      )
    } finally {
      console.groupEnd()
    }
  }

  const logout = (): void => {
    console.log('[AuthStore] 执行登出')
    token.value = null
    user.value = null
    localStorage.removeItem('authToken')
    sessionStorage.removeItem('authToken')
  }

  // 新增：快捷访问属性
  const isAuthenticated = () => !!token.value
  const currentUser = () => user.value

  // 初始化 store
  initialize()

  return { 
    user,
    token,
    isAuthenticated,
    currentUser,
    register,
    login,
    logout,
    getUserInfo
  }
})