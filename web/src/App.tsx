import { Flex, Heading, Separator, Table } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Link } from 'react-router-dom';
import { Routes } from 'routes';


// Input data from the simulation
type AgentData = Record<string, Record<string, number>>;
type DataFrame = Record<string, AgentData>;
type DataPoint = [number, number, DataFrame];

// Output data to the plot
type PlottedAgentData = Record<string, number[]>;
type PlottedFrame = Record<string, PlottedAgentData>;

const App = () => {
  // Store plot data in state.
  const [positionData, setPositionData] = useState<PlottedAgentData[]>([]);
  const [velocityData, setVelocityData] = useState<PlottedAgentData[]>([]);
  const [initialState, setInitialState] = useState<DataFrame>({});

  

  useEffect(() => {

  

    // fetch plot data when the component mounts
    let canceled = false;

    async function fetchData() {
      console.log('calling fetchdata...');

      try {
        // data should be populated from a POST call to the simulation server
        const response = await fetch('http://localhost:8000/simulation');
        if (canceled) return;
        const data: DataPoint[] = await response.json();
        const updatedPositionData: PlottedFrame = {};
        const updatedVelocityData: PlottedFrame = {};

        // NOTE: Uncomment to see the raw data in the console
        // console.log('Data:', data);

        setInitialState(data[0][2]);

        const baseData = () => ({
          x: [],
          y: [],
          z: [],
          type: 'scatter3d',
          mode: 'lines+markers',
          marker: { size: 4 },
          line: { width: 2 },
        });

        data.forEach(([t0, t1, frame]) => {
          for (let [agentId, val] of Object.entries(frame)) {
              if (agentId == "time" || agentId == "timeStep") {
                continue;
              }
              let {position, velocity} = val;
              updatedPositionData[agentId] = updatedPositionData[agentId] || baseData();
              updatedPositionData[agentId].x.push(position.x);
              updatedPositionData[agentId].y.push(position.y);
              updatedPositionData[agentId].z.push(position.z);

              updatedVelocityData[agentId] = updatedVelocityData[agentId] || baseData();
              updatedVelocityData[agentId].x.push(velocity.x);
              updatedVelocityData[agentId].y.push(velocity.y);
              updatedVelocityData[agentId].z.push(velocity.z);
          }
        });
        setPositionData(Object.values(updatedPositionData));
        setVelocityData(Object.values(updatedVelocityData));
        console.log('Set plot data!');
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