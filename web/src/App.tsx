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
    position: {},
    velocity: {}
  });

  

  useEffect(() => {

    // MC: Get rid of fetch event source set up
    let eventSource: EventSource | null = null;
    let canceled = false;

    async function setupEventSource() {
      try {


        // example code to start: 
          /* const eventSource = new EventSource('/stream');

        eventSource.onmessage = (event) => {
          console.log('Received event:', event.data);
          // Update the UI with the new data
        };

          eventSource.onerror = (error) => {
            console.error('Error:', error);
            eventSource.close();
  };
*/
        // Using url instead of /stream look at webscraper proj for reference 
        const params = new URLSearchParams(window.location.search);
        const url = `http://localhost:8000/simulation/stream?${params.toString()}`;
        
        eventSource = new EventSource(url);
        
        eventSource.onmessage = (event) => {
          if (canceled) return;
          
          const data = JSON.parse(event.data);
          
          // Logging bc so many update errors 
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

          // Update plot history
          setPlotHistory(prevHistory => {
            const newHistory = {
              position: { ...prevHistory.position },
              velocity: { ...prevHistory.velocity }
            };

            for (const [agentId, val] of Object.entries(data)) {
              if (agentId === "time" || agentId === "timeStep") continue;
              
              const { position, velocity } = val as any;
              
              // Initialize arrays if they don't exist
              if (!newHistory.position[agentId]) {
                newHistory.position[agentId] = { x: [], y: [], z: [] };
                newHistory.velocity[agentId] = { x: [], y: [], z: [] };
              }
              
              // Append new values
              newHistory.position[agentId].x.push(position.x);
              newHistory.position[agentId].y.push(position.y);
              newHistory.position[agentId].z.push(position.z);
              
              newHistory.velocity[agentId].x.push(velocity.x);
              newHistory.velocity[agentId].y.push(velocity.y);
              newHistory.velocity[agentId].z.push(velocity.z);
            }
            
            return newHistory;
          });

          // Process simulation data for plots
          const updatedPositionData: PlottedFrame = {};
          const updatedVelocityData: PlottedFrame = {};

          const baseData = () => ({
            type: 'scatter3d',
            mode: 'lines+markers',
            marker: { size: 4 },
            line: { width: 2 },
          });

          // Convert history to plot data format
          for (const [agentId, data] of Object.entries(plotHistory.position)) {
            updatedPositionData[agentId] = {
              ...baseData(),
              x: data.x,
              y: data.y,
              z: data.z,
              name: agentId,
              type: 'scatter3d' as const,
              mode: 'lines+markers' as const
            };
          }

          for (const [agentId, data] of Object.entries(plotHistory.velocity)) {
            updatedVelocityData[agentId] = {
              ...baseData(),
              x: data.x,
              y: data.y,
              z: data.z,
              name: agentId,
              type: 'scatter3d' as const,
              mode: 'lines+markers' as const
            };
          }

          setPositionData(Object.values(updatedPositionData));
          setVelocityData(Object.values(updatedVelocityData));
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
            style={{ width: '45%', height: '100%', margin: '5px' }}
            data={positionData}
            layout={{
              title: 'Position',
              scene: {
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                zaxis: { title: 'Z' },
              },
              autosize: true,
              dragmode: 'turntable',
            }}
            useResizeHandler
            config={{
              scrollZoom: true,
            }}
          />
          <Plot
            style={{ width: '45%', height: '100%', margin: '5px' }}
            data={velocityData}
            layout={{
              title: 'Velocity',
              scene: {
                xaxis: { title: 'X' },
                yaxis: { title: 'Y' },
                zaxis: { title: 'Z' },
              },
              autosize: true,
              dragmode: 'turntable',
            }}
            useResizeHandler
            config={{
              scrollZoom: true,
            }}
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