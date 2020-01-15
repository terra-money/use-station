import axios from 'axios'

const instance = axios.create()

instance.interceptors.request.use(({ params, ...config }) => ({
  ...config,
  params: { ...params, _t: Date.now() }
}))

export default instance
