import { Flex, Heading, Separator, Table } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Link } from 'react-router-dom';
import { Routes } from 'routes';
import { Data } from 'plotly.js';


// Input data from the simulation
type AgentData = Record<string, Record<string, number>>;
type DataFrame = Record<string, AgentData>;
type DataPoint = [number, number, DataFrame];

// Output data to the plot

// Changed to have same fromat as base data
type PlottedAgentData = Partial<Data> & {
  x: number[];
  y: number[];
  z: number[];
  type: 'scatter3d';
  mode: 'lines+markers';
  marker: { size: number };
  line: { width: number };
  name?: string;
};
type PlottedFrame = Record<string, PlottedAgentData>;

const App = () => {
  // Store plot data in state.
  const [positionData, setPositionData] = useState<PlottedAgentData[]>([]);
  const [velocityData, setVelocityData] = useState<PlottedAgentData[]>([]);
  const [initialState, setInitialState] = useState<DataFrame>({});

  // Storing current data and history so can update trajectory
  const [currentData, setCurrentData] = useState<DataFrame>({});
  const [plotHistory, setPlotHistory] = useState<{
    position: Record<string, { x: number[], y: number[], z: number[] }>;
    velocity: Record<string, { x: number[], y: number[], z: number[] }>;
  }>({
    position: {
      Body1: { x: [], y: [], z: [] },
      Body2: { x: [], y: [], z: [] }
    },
    velocity: {
      Body1: { x: [], y: [], z: [] },
      Body2: { x: [], y: [], z: [] }
    }
  });

  

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let canceled = false;

    async function setupEventSource() {
      try {

        // MC: Get rid of fetch event source set up
        const params = new URLSearchParams(window.location.search);
        const url = `http://localhost:8000/simulation/stream?${params.toString()}`;
        
        eventSource = new EventSource(url);
        
        eventSource.onmessage = (event) => {
          if (canceled) return;
          

          // Consoling data to catch errors
          const data = JSON.parse(event.data);
          console.log('Received raw data:', data);
          
          if (data.heartbeat) {
            console.log('Heartbeat received');
            return;
          }
          
          if (data.error) {
            console.error('Error from server:', data.error);
            return;
          }
          
          if (data.complete) {
            console.log('Simulation complete');
            eventSource?.close();
            return;
          }

          // Update current data for the table
          setCurrentData(data);

          // Create new history data
          const newHistory = {
            position: { ...plotHistory.position },
            velocity: { ...plotHistory.velocity }
          };

          // Process incoming data
          for (const [agentId, val] of Object.entries(data)) {
            if (agentId === "time" || agentId === "timeStep") continue;
            
            const { position, velocity } = val as any;
            console.log(`Processing ${agentId}:`, { position, velocity });
            
            // Append new values
            newHistory.position[agentId].x.push(position.x);
            newHistory.position[agentId].y.push(position.y);
            newHistory.position[agentId].z.push(position.z);
            
            newHistory.velocity[agentId].x.push(velocity.x);
            newHistory.velocity[agentId].y.push(velocity.y);
            newHistory.velocity[agentId].z.push(velocity.z);
          }
          
          console.log('Updated history:', newHistory);
          setPlotHistory(newHistory);

          // Process simulation data for plots
          const updatedPositionData: PlottedFrame = {};
          const updatedVelocityData: PlottedFrame = {};

          const baseData = () => ({
            type: 'scatter3d' as const,
            mode: 'lines+markers' as const,
            marker: { size: 4 },
            line: { width: 2 },
          });

          // Convert history to plot data format using the new history data
          for (const [agentId, data] of Object.entries(newHistory.position)) {
            console.log(`Creating position plot data for ${agentId}:`, data);
            if (data.x.length > 0) {  // Only add if we have data
              const trace = {
                ...baseData(),
                x: [...data.x],  // Create a new array to ensure proper data structure
                y: [...data.y],
                z: [...data.z],
                name: agentId,
                line: {
                  width: 2,
                  color: agentId === 'Body1' ? '#1f77b4' : '#ff7f0e'
                },
                marker: {
                  size: 4,
                  color: agentId === 'Body1' ? '#1f77b4' : '#ff7f0e'
                }
              };
              console.log(`Created position trace for ${agentId}:`, trace);
              updatedPositionData[agentId] = trace;
            }
          }

          for (const [agentId, data] of Object.entries(newHistory.velocity)) {
            console.log(`Creating velocity plot data for ${agentId}:`, data);
            if (data.x.length > 0) {  // Only add if we have data
              const trace = {
                ...baseData(),
                x: [...data.x],  // Create a new array to ensure proper data structure
                y: [...data.y],
                z: [...data.z],
                name: agentId,
                line: {
                  width: 2,
                  color: agentId === 'Body1' ? '#1f77b4' : '#ff7f0e'
                },
                marker: {
                  size: 4,
                  color: agentId === 'Body1' ? '#1f77b4' : '#ff7f0e'
                }
              };
              console.log(`Created velocity trace for ${agentId}:`, trace);
              updatedVelocityData[agentId] = trace;
            }
          }

          const positionDataArray = Object.values(updatedPositionData);
          const velocityDataArray = Object.values(updatedVelocityData);
          
          console.log('Final position data for plot:', JSON.stringify(positionDataArray, null, 2));
          console.log('Final velocity data for plot:', JSON.stringify(velocityDataArray, null, 2));

          // Only update if we have data
          if (positionDataArray.length > 0) {
            setPositionData(positionDataArray);
          }
          if (velocityDataArray.length > 0) {
            setVelocityData(velocityDataArray);
          }
        };

        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          eventSource?.close();
        };

      } catch (error) {
        console.error('Error setting up EventSource:', error);
      }
    }

    setupEventSource();

    return () => {
      canceled = true;
      eventSource?.close();
    };
  }, []);

  return (
    
    <div
      style={{
        height: '100vh',
        width: '100vw',
        margin: '0 auto',
        position: 'relative',
       overflow: 'hidden',
      
      }}
    >
        //* UI CHANGE: Background Video
  <video
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      minWidth: '100%',
      minHeight: '100%',
      objectFit: 'cover',
      zIndex: 0,
    }}
  >
    <source src="/bg_video.mp4" type="video/mp4" />
    Your browser does not support the video tag.
  </video>

      {/* Flex: https://www.radix-ui.com/themes/docs/components/flex */}
      <Flex direction="column" m="4" width="100%" justify="center" align="center" style={{ position: 'relative', zIndex: 1 }}>
        <Heading 
          as="h1" 
          size="8" 
          weight="bold" 
          mb="4"
          style={{
            fontFamily: "'Poppins', 'Helvetica Neue', Arial, sans-serif",
            letterSpacing: '-0.02em',
            color: "brown"
          }}
        >
          Simulation Data
        </Heading>
        <Link to={Routes.FORM} style={{ color: 'brown' }}>Define new simulation parameters</Link>
        <Separator size="4" my="5" />

        {/* MC: Live Data Update */}
        <Flex justify="center" width="100%" mb="4">
          <Table.Root style={{ width: '800px', color: 'black', borderRadius: '8px', padding: '1rem' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Current Position (x, y, z)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Current Velocity (x, y, z)</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body style = {{color: 'black'}}>
              {Object.entries(currentData).map(([agentId, data]: [string, any]) => {
                if (agentId === "time" || agentId === "timeStep") return null;
                const { position, velocity } = data;
                return (
                  <Table.Row key={agentId}>
                    <Table.RowHeaderCell>{agentId}</Table.RowHeaderCell>
                    <Table.Cell>
                      ({position.x.toFixed(4)}, {position.y.toFixed(4)}, {position.z.toFixed(4)})
                    </Table.Cell>
                    <Table.Cell>
                      ({velocity.x.toFixed(4)}, {velocity.y.toFixed(4)}, {velocity.z.toFixed(4)})
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Flex>
        <Flex direction="row" width="100%" justify="center">
          <Plot
            style={{ width: '45%', height: '400px', margin: '5px' }}
            data={positionData}
            layout={{
              title: 'Position',
              scene: {
                xaxis: { 
                  title: 'X',
                  range: [-100, 100]
                },
                yaxis: { 
                  title: 'Y',
                  range: [-100, 100]
                },
                zaxis: { 
                  title: 'Z',
                  range: [-100, 100]
                },
                camera: {
                  eye: { x: 1.5, y: 1.5, z: 1.5 },
                  center: { x: 0, y: 0, z: 0 },
                  up: { x: 0, y: 0, z: 1 }
                }
              },
              autosize: true,
              dragmode: 'turntable',
              showlegend: true,
              legend: {
                orientation: 'h',
                yanchor: 'bottom',
                y: 1.02,
                xanchor: 'right',
                x: 1
              }
            }}
            useResizeHandler
            config={{
              scrollZoom: true,
              displayModeBar: true
            }}
            onError={(err) => console.error('Position plot error:', err)}
            onInitialized={() => console.log('Position plot initialized with data:', positionData)}
            onUpdate={(figure) => console.log('Position plot updated with data:', figure)}
          />
          <Plot
            style={{ width: '45%', height: '400px', margin: '5px' }}
            data={velocityData}
            layout={{
              title: 'Velocity',
              scene: {
                xaxis: { 
                  title: 'X',
                  range: [-10, 10]
                },
                yaxis: { 
                  title: 'Y',
                  range: [-10, 10]
                },
                zaxis: { 
                  title: 'Z',
                  range: [-10, 10]
                },
                camera: {
                  eye: { x: 1.5, y: 1.5, z: 1.5 },
                  center: { x: 0, y: 0, z: 0 },
                  up: { x: 0, y: 0, z: 1 }
                }
              },
              autosize: true,
              dragmode: 'turntable',
              showlegend: true,
              legend: {
                orientation: 'h',
                yanchor: 'bottom',
                y: 1.02,
                xanchor: 'right',
                x: 1
              }
            }}
            useResizeHandler
            config={{
              scrollZoom: true,
              displayModeBar: true
            }}
            onError={(err) => console.error('Velocity plot error:', err)}
            onInitialized={() => console.log('Velocity plot initialized with data:', velocityData)}
            onUpdate={(figure) => console.log('Velocity plot updated with data:', figure)}
          />
        </Flex>
        {/* <Flex justify="center" width="100%" m="4">
          <Table.Root style={{ width: '800px', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', padding: '1rem' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Position (x, y, z)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Velocity (x, y, z)</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Object.entries(initialState).map(([agentId, { position, velocity }]) => {
                if (!position) return null;
                return (
                  <Table.Row key={agentId}>
                    <Table.RowHeaderCell>{agentId}</Table.RowHeaderCell>
                    <Table.Cell>
                      ({position.x.toFixed(4)}, {position.y.toFixed(4)}, {position.z.toFixed(4)})
                    </Table.Cell>
                    <Table.Cell>
                      ({velocity.x.toFixed(4)}, {velocity.y.toFixed(4)}, {velocity.z.toFixed(4)})
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Flex> */}
      </Flex>
    </div>
  );
};

export default App;