import { useState, useEffect } from 'react'
import { Line, Pie, Doughnut } from 'react-chartjs-2'
import axios from 'axios'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

export default function App() {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('http://localhost:8000/api/investments/')
      .then(res => {
        setInvestments(res.data)
        console.log(res.data)
        setLoading(false)
      })
      .catch(err => console.error(err))
  }, [])



        
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Investment Dashboard</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="mb-6">
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Investment Distribution</h2>
            <Doughnut
              data={{
                labels: investments.map(inv => inv.name),
                datasets: [{
                  data: investments.map(inv => inv.amount),
                  backgroundColor: investments.map((_, index) => `hsl(${index * 60}, 70%, 50%)`),
                }]
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}