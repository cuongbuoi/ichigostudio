// IndexNow key file. API (khi đăng SP/bài mới) ping IndexNow với keyLocation
// trỏ tới URL này; nội dung phải đúng bằng key. Key IndexNow là PUBLIC (theo thiết kế).
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  return '8f4b2e9c7a1d6035e2c8b4f1a9d7603e'
})
