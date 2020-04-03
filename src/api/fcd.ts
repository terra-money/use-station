import axios from 'axios'

const instance = axios.create()

type Params = { height?: number; time: number }
export const intercept = ({ height, time }: Params) => {
  instance.interceptors.request.use(config => {
    const { _h, _t }: { _h?: number; _t?: number } = config.params ?? {}
    const params = {
      // Why?
      // Because of the order in which these these parameters are applied.
      // time: Always exists
      // height: Use current value when possible or use previous value
      _t: Math.max(_t ?? 0, time),
      _h: _h || height ? Math.max(_h ?? 0, height ?? 0) : undefined
    }

    return { ...config, params: { ...config.params, ...params } }
  })
}

export default instance
