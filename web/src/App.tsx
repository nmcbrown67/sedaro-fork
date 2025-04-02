import { Flex, Heading, Separator, Table } from '@radix-ui/themes';
import { useEffect, useState, useMemo } from 'react';
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
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : `http://${window.location.hostname}:8000`;
    const eventSource = new EventSource(`${apiUrl}/simulation/stream${window.location.search}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received SSE data:", data);

        // Handle special messages
        if (data.heartbeat) {
          console.log("Received heartbeat");
          return;
        }

        if (data.complete) {
          console.log("Simulation complete");
          eventSource.close();
          return;
        }

        if (data.error) {
          console.error("Server error:", data.error);
          return;
        }

        // Process simulation data
        Object.entries(data).forEach(([agentId, state]: [string, any]) => {
          const pos = state.position;
          const vel = state.velocity;

          console.log(`Processing data for ${agentId}:`, {
            position: pos,
            velocity: vel
          });

          if (!pos || !vel) {
            console.error(`Missing position or velocity data for ${agentId}`);
            return;
          }

          setPositionData(prev => {
            const newData = { ...prev };
            if (!newData[agentId]) {
              newData[agentId] = {
                x: [] as number[],
                y: [] as number[],
                z: [] as number[],
                type: 'scatter3d' as const,
                mode: 'lines+markers' as const,
                marker: { size: 5 },
                line: { width: 2 },
                name: `${agentId} Position`
              };
            }

            // Verify the data is numeric
            if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number') {
              console.error(`Invalid position data for ${agentId}:`, pos);
              return prev;
            }

            newData[agentId].x.push(pos.x);
            newData[agentId].y.push(pos.y);
            newData[agentId].z.push(pos.z);

            console.log(`Updated position data for ${agentId}:`, {
              x: newData[agentId].x.slice(-1),
              y: newData[agentId].y.slice(-1),
              z: newData[agentId].z.slice(-1)
            });

            return newData;
          });

          setVelocityData(prev => {
            const newData = { ...prev };
            if (!newData[agentId]) {
              newData[agentId] = {
                x: [] as number[],
                y: [] as number[],
                z: [] as number[],
                type: 'scatter3d' as const,
                mode: 'lines+markers' as const,
                marker: { size: 5 },
                line: { width: 2 },
                name: `${agentId} Velocity`
              };
            }

            // Verify the data is numeric
            if (typeof vel.x !== 'number' || typeof vel.y !== 'number' || typeof vel.z !== 'number') {
              console.error(`Invalid velocity data for ${agentId}:`, vel);
              return prev;
            }

            newData[agentId].x.push(vel.x);
            newData[agentId].y.push(vel.y);
            newData[agentId].z.push(vel.z);

            console.log(`Updated velocity data for ${agentId}:`, {
              x: newData[agentId].x.slice(-1),
              y: newData[agentId].y.slice(-1),
              z: newData[agentId].z.slice(-1)
            });

            return newData;
          });

          // Update initial state if not already set
          setInitialState(prev => {
            if (Object.keys(prev).length === 0) {
              return { [agentId]: { position: pos, velocity: vel } };
            }
            return prev;
          });
        });
      } catch (error) {
        console.error("Error processing SSE message:", error, event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Create plot data
  const plotData = useMemo(() => {
    console.log("Creating plot data with:", {
      positionData: Object.fromEntries(
        Object.entries(positionData).map(([k, v]) => [k, {
          x: v.x.slice(-1),
          y: v.y.slice(-1),
          z: v.z.slice(-1)
        }])
      ),
      velocityData: Object.fromEntries(
        Object.entries(velocityData).map(([k, v]) => [k, {
          x: v.x.slice(-1),
          y: v.y.slice(-1),
          z: v.z.slice(-1)
        }])
      )
    });

    const data: any[] = [];

    Object.entries(positionData).forEach(([agentId, pos], index) => {
      const vel = velocityData[agentId];
      if (!vel) {
        console.warn(`No velocity data for ${agentId}`);
        return;
      }

      // Position plot
      data.push({
        ...pos,
        marker: {
          ...pos.marker,
          color: index === 0 ? 'red' : 'blue',
        },
        line: {
          ...pos.line,
          color: index === 0 ? 'red' : 'blue',
        },
      });

      // Velocity plot
      data.push({
        ...vel,
        marker: {
          ...vel.marker,
          color: index === 0 ? 'orange' : 'green',
        },
        line: {
          ...vel.line,
          color: index === 0 ? 'orange' : 'green',
        },
      });
    });

    return data;
  }, [positionData, velocityData]);

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