import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';

// Input data from the simulation
type AgentData = Record<string, number>;
type DataFrame = Record<string, AgentData>;
type DataPoint = [number, number, DataFrame];

// Output data to the plot
type PlottedAgentData = Record<string, number[]>;
type PlottedFrame = Record<string, PlottedAgentData>;

const App = () => {
  // Store plot data in state.
  const [plotData, setPlotData] = useState<PlottedAgentData[]>([]);

  useEffect(() => {
    // fetch plot data when the component mounts
    let canceled = false;

    async function fetchData() {
      console.log('calling fetchdata...');

      try {
        // '/data' should be populated from a run of sim.py
        const response = await fetch('http://localhost:8000/data');
        if (canceled) return;
        const data: DataPoint[] = await response.json();
        const updatedPlotData: PlottedFrame = {};

        data.forEach(([t0, t1, frame]) => {
          for (let [agentId, { x, y }] of Object.entries(frame)) {
            updatedPlotData[agentId] = updatedPlotData[agentId] || { x: [], y: [] };
            updatedPlotData[agentId].x.push(x);
            updatedPlotData[agentId].y.push(y);
          }
        });

        setPlotData(Object.values(updatedPlotData));
        console.log('plotData:', Object.values(updatedPlotData));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
      }}
    >
      <Plot
        style={{ width: '100%', height: '100%' }}
        data={plotData}
        layout={{
          yaxis: { scaleanchor: 'x' },
          autosize: true,
          dragmode: 'pan',
        }}
        useResizeHandler
        config={{
          scrollZoom: true,
        }}
      />
    </div>
  );
};

export default App;
