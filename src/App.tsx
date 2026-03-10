import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import ScreenerPage from './pages/ScreenerPage'
import StockPage from './pages/StockPage'

export default function App() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/screener" element={<ScreenerPage />} />
          <Route path="/stock/:ticker" element={<StockPage />} />
        </Routes>
      </main>
    </>
  )
}
