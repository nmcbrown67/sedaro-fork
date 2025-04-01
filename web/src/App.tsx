import { Flex, Heading, Separator, Table } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Link } from 'react-router-dom';
import { Routes } from 'routes';


type AgentState = {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
};

type SimulationFrame = Record<string, AgentState>;

type PlottedAgentData = {
  [agentId: string]: {
    x: number[];
    y: number[];
    z: number[];
    type: 'scatter3d';
    mode: 'lines+markers';
    marker: { size: number; color?: string };
    line: { width: number; color?: string };
    name?: string;
    hoverinfo?: 'all' | 'name' | 'none';
  };
};


const baseData = () => {
  return {
    x: [] as number[],
    y: [] as number[],
    z: [] as number[],
    type: 'scatter3d' as const,
    mode: 'lines+markers' as const,
    marker: { size: 5, color: 'red' },
    line: { width: 3, color: 'orange' },
    name: '',
    hoverinfo: 'all' as const
  };
};


// // Input data from the simulation
// type AgentData = Record<string, Record<string, number>>;
// type DataFrame = Record<string, AgentData>;
// type DataPoint = [number, number, DataFrame];

// // Output data to the plot
// type PlottedAgentData = Record<string, number[]>;
// type PlottedFrame = Record<string, PlottedAgentData>;

const App = () => {
  // Store plot data in state.
  const [positionData, setPositionData] = useState<PlottedAgentData>({});
  const [velocityData, setVelocityData] = useState<PlottedAgentData>({});
  const [initialState, setInitialState] = useState<SimulationFrame>({});


  useEffect(() => {
    // Create an EventSource that connects to the SSE endpoint.
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : `http://${window.location.hostname}:8000`;
    
    const searchParams = new URLSearchParams(window.location.search);
    const eventSourceUrl = `${apiUrl}/simulation/stream?${searchParams.toString()}`;
    console.log('Connecting to SSE endpoint:', eventSourceUrl);
    
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number | null = null;
    
    const connectEventSource = () => {
      if (eventSource) {
        eventSource.close();
      }
      
      console.log('Creating new EventSource with URL:', eventSourceUrl);
      eventSource = new EventSource(eventSourceUrl);
      
      eventSource.onopen = () => {
        console.log('SSE connection opened');
      };
      
      eventSource.onmessage = (event) => {
        try {
          // Each message is a simulation frame (an object keyed by agentId)
          const data = JSON.parse(event.data);
          console.log('Received data:', data);
          
          // Handle heartbeat messages
          if (data.heartbeat) {
            console.log('Received heartbeat');
            return;
          }
          
          // Handle completion message
          if (data.complete) {
            console.log('Simulation complete');
            if (eventSource) {
              eventSource.close();
            }
            return;
          }
          
          // Check for error message from server
          if (data.error) {
            console.error('Server error:', data.error);
            return;
          }
          
          // Process simulation frame (object keyed by agentId)
          const frame: SimulationFrame = data;
          console.log('Processing frame:', frame);

          // Update initial state if not already set
          setInitialState((prev) => {
            // Only update if empty
            if (Object.keys(prev).length === 0) {
              return frame;
            }
            return prev;
          });

          // Update plotting data by appending new positions and velocities.
          setPositionData((prevData) => {
            const newData = { ...prevData };
            let updated = false;
            
            Object.entries(frame).forEach(([agentId, state]) => {
              if (!state.position) {
                console.error(`Missing position data for ${agentId}:`, state);
                return;
              }
              
              if (!newData[agentId]) {
                newData[agentId] = baseData();
                newData[agentId].name = agentId;
                updated = true;
              }
              
              // Verify the data is accessible and valid
              if (typeof state.position.x === 'number' && 
                  typeof state.position.y === 'number' && 
                  typeof state.position.z === 'number') {
                console.log(`Adding position for ${agentId}:`, state.position);
                
                newData[agentId].x.push(state.position.x);
                newData[agentId].y.push(state.position.y);
                newData[agentId].z.push(state.position.z);
                updated = true;
              } else {
                console.error(`Invalid position data for ${agentId}:`, state.position);
              }
            });
            
            console.log('Updated position data:', newData);
            return updated ? newData : prevData;
          });

          setVelocityData((prevData) => {
            const newData = { ...prevData };
            let updated = false;
            
            Object.entries(frame).forEach(([agentId, state]) => {
              if (!state.velocity) {
                console.error(`Missing velocity data for ${agentId}:`, state);
                return;
              }
              
              if (!newData[agentId]) {
                newData[agentId] = baseData();
                newData[agentId].name = agentId;
                updated = true;
              }
              
              // Verify the data is accessible and valid
              if (typeof state.velocity.x === 'number' && 
                  typeof state.velocity.y === 'number' && 
                  typeof state.velocity.z === 'number') {
                console.log(`Adding velocity for ${agentId}:`, state.velocity);
                
                newData[agentId].x.push(state.velocity.x);
                newData[agentId].y.push(state.velocity.y);
                newData[agentId].z.push(state.velocity.z);
                updated = true;
              } else {
                console.error(`Invalid velocity data for ${agentId}:`, state.velocity);
              }
            });
            
            console.log('Updated velocity data:', newData);
            return updated ? newData : prevData;
          });
        } catch (error) {
          console.error('Error processing simulation data:', error);
          console.error('Raw event data:', event.data);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        console.error('EventSource readyState:', eventSource?.readyState);
        
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Try to reconnect after a short delay
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectEventSource();
        }, 2000);
      };
    };
    
    // Initial connection
    connectEventSource();
    
    // Cleanup on unmount
    return () => {
      console.log('Cleaning up EventSource connection');
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

// Convert the plotted data objects to arrays for Plotly.
const positionPlots = Object.values(positionData);
const velocityPlots = Object.values(velocityData);

// Assign different colors to different bodies
if (positionPlots.length > 0 && positionPlots[0]) {
  positionPlots[0].marker = { size: 6, color: 'red' };
  positionPlots[0].line = { width: 3, color: 'red' };
}
if (positionPlots.length > 1 && positionPlots[1]) {
  positionPlots[1].marker = { size: 6, color: 'blue' };
  positionPlots[1].line = { width: 3, color: 'blue' };
}
if (velocityPlots.length > 0 && velocityPlots[0]) {
  velocityPlots[0].marker = { size: 6, color: 'red' };
  velocityPlots[0].line = { width: 3, color: 'red' };
}
if (velocityPlots.length > 1 && velocityPlots[1]) {
  velocityPlots[1].marker = { size: 6, color: 'blue' };
  velocityPlots[1].line = { width: 3, color: 'blue' };
}

console.log('Current position plots:', positionPlots);
console.log('Current velocity plots:', velocityPlots);
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
        <Link to={Routes.FORM} >Define new simulation parameters</Link>
        <Separator size="4" my="5" />
        <Flex direction="row" width="100%" justify="center">
          <Plot
            style={{ width: '45%', height: '100%', margin: '5px' }}
            data={positionPlots}
            layout={{
              title: 'Position',
              scene: {
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                zaxis: { title: 'Z' },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
              },
              autosize: true,
              dragmode: 'turntable',
              showlegend: true,
              uirevision: 'true',
            }}
            useResizeHandler
            config={{
              scrollZoom: true,
              responsive: true,
              displayModeBar: true
            }}
            revision={positionPlots.reduce((acc, plot) => acc + plot.x.length, 0)}
          />
          <Plot
            style={{ width: '45%', height: '100%', margin: '5px' }}
            data={velocityPlots}
            layout={{
              title: 'Velocity',
              scene: {
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                zaxis: { title: 'Z' },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
              },
              autosize: true,
              dragmode: 'turntable',
              showlegend: true,
              uirevision: 'true',
            }}
            useResizeHandler
            config={{
              scrollZoom: true,
              responsive: true,
              displayModeBar: true
            }}
            revision={velocityPlots.reduce((acc, plot) => acc + plot.x.length, 0)}
          />
        </Flex>
        <Flex justify="center" width="100%" m="4">
          <Table.Root
            style={{
              width: '800px',
            }}
          >
            {/* Table: https://www.radix-ui.com/themes/docs/components/table */}
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Position (x,y, z)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Velocity (x,y,z)</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {Object.entries(initialState).flatMap(
                  ([agentId, { position, velocity }]) => {
                    if (position) {
                    return (
                <Table.Row key={agentId}>
                  <Table.RowHeaderCell>{agentId}</Table.RowHeaderCell>
                  <Table.Cell>
                    ({position.x}, {position.y}, {position.z})
                  </Table.Cell>
                  <Table.Cell>
                    ({velocity.x}, {velocity.y}, {velocity.z})
                  </Table.Cell>
                </Table.Row>
                  );} else {
                    return null;
                  }
                }
              )}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Flex>
    </div>
  );
};

export default App;