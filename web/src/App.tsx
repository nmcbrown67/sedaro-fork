import { Flex, Heading, Separator, Table } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Link } from 'react-router-dom';
import { Routes } from 'routes';

// Define types for our traces and agent state.
type PlottedAgentData = {
  x: number[];
  y: number[];
  z: number[];
  type: string;
  mode: string;
  marker: { size: number };
  line: { width: number };
};

type AgentState = {
  position?: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
};

type DataFrame = Record<string, AgentState>;

const App = () => {
  // We use objects keyed by agentId so that each update can be merged.
  const [positionTraces, setPositionTraces] = useState<Record<string, PlottedAgentData>>({});
  const [velocityTraces, setVelocityTraces] = useState<Record<string, PlottedAgentData>>({});
  const [initialState, setInitialState] = useState<DataFrame>({});

  useEffect(() => {
    // Connect to the SSE endpoint.
    const eventSource = new EventSource('http://localhost:8000/simulation-sse');
    console.log('Connected to SSE endpoint');

    // Helper function to create a new trace.
    const createTrace = (): PlottedAgentData => ({
      x: [],
      y: [],
      z: [],
      type: 'scatter3d',
      mode: 'lines+markers',
      marker: { size: 4 },
      line: { width: 2 },
    });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received SSE data:", data);
      // If a simulation-complete message is sent, handle accordingly.
      if (data.message) {
        console.log('Simulation finished:', data.message);
        eventSource.close();
        return;
      }
      // Data is expected to be in the form:
      // { "<agentId>": { position: {...}, velocity: {...}, ... } }
      // Iterate over all keys (agent IDs) in the update.
      for (const agentId in data) {
        const agentUpdate = data[agentId];

        // Update the initial state only once.
        setInitialState((prev) => {
          if (!prev[agentId] && agentUpdate.position && agentUpdate.velocity) {
            return {
              ...prev,
              [agentId]: {
                position: agentUpdate.position,
                velocity: agentUpdate.velocity,
              },
            };
          }
          return prev;
        });

        // Update position trace.
        setPositionTraces((prev) => {
          const updated = { ...prev };
          if (!updated[agentId]) {
            updated[agentId] = createTrace();
          }
          const { x, y, z } = updated[agentId];
          if (agentUpdate.position) {
            x.push(agentUpdate.position.x);
            y.push(agentUpdate.position.y);
            z.push(agentUpdate.position.z);
          }
          return updated;
        });

        // Update velocity trace.
        setVelocityTraces((prev) => {
          const updated = { ...prev };
          if (!updated[agentId]) {
            updated[agentId] = createTrace();
          }
          const { x, y, z } = updated[agentId];
          if (agentUpdate.velocity) {
            x.push(agentUpdate.velocity.x);
            y.push(agentUpdate.velocity.y);
            z.push(agentUpdate.velocity.z);
          }
          return updated;
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      eventSource.close();
    };

    // Clean up on component unmount.
    return () => {
      eventSource.close();
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
      {/* Background Video */}
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

      {/* Main UI */}
      <Flex
        direction="column"
        m="4"
        width="100%"
        justify="center"
        align="center"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Heading
          as="h1"
          size="8"
          weight="bold"
          mb="4"
          style={{
            fontFamily: "'Poppins', 'Helvetica Neue', Arial, sans-serif",
            letterSpacing: '-0.02em',
            color: 'brown',
          }}
        >
          Simulation Data
        </Heading>
        <Link to={Routes.FORM}>Define new simulation parameters</Link>
        <Separator size="4" my="5" />
        <Flex direction="row" width="100%" justify="center">
          <Plot
            style={{ width: '45%', height: '100%', margin: '5px' }}
            data={Object.values(positionTraces)}
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
            config={{ scrollZoom: true }}
          />
          <Plot
            style={{ width: '45%', height: '100%', margin: '5px' }}
            data={Object.values(velocityTraces)}
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
            config={{ scrollZoom: true }}
          />
        </Flex>
        <Flex justify="center" width="100%" m="4">
          <Table.Root style={{ width: '800px' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Position (x,y,z)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Velocity (x,y,z)</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Object.entries(initialState).map(([agentId, state]) => (
                <Table.Row key={agentId}>
                  <Table.RowHeaderCell>{agentId}</Table.RowHeaderCell>
                  <Table.Cell>
                    ({state.position?.x}, {state.position?.y}, {state.position?.z})
                  </Table.Cell>
                  <Table.Cell>
                    ({state.velocity?.x}, {state.velocity?.y}, {state.velocity?.z})
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Flex>
    </div>
  );
};

export default App;
