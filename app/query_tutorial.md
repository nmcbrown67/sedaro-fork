In Sedaro Nano, the simulation is made up of *agents* that have state and *managers* that define how that state evolves over time. The managers are Python functions that consume arguments from the simulator and produce a result value. The agent specifies what state should be passed into those arguments and where the result should be stored through a simple query language.

At the starting point for the exercise, the velocity of the first agent is bound to the `identity` statemanager by the following block:
```
        {
            'consumed': '''(
                prev!(velocity),
            )''',
            'produced': '''velocity''',
            'function': identity,
        }
```

We want to bind it to the `propagate_velocity` statemanager, which takes into account the gravitational force of the other agent. First, we'll replace `identity` with `propagate_velocity`, but this is insufficient:

```
app  | TypeError: propagate_velocity() missing 4 required positional arguments: 'position', 'velocity', 'other_position', and 'm_other'
```

We'll need to extend the query to include the remaining arguments. We can get our other state from the same agent:
```
            'consumed': '''(
                timeStep,
                prev!(velocity),
                position,
            )''',
```

This results in a deadlock, since the current position depends on the current velocity, which depends on the current position:

```
app  | Exception: No progress made while evaluating statemanagers for agent Body1. Remaining statemanagers: ['propagate_velocity', 'propagate_position', 'time_manager', 'timestep_manager']
```

We can avoid this by wrapping our consumed queries in `prev!()`, which indicates that we want to read the value as computed in the most recent previous simulation step, rather than the value computed in the current simulation step.

```
            'consumed': '''(
                timeStep,
                prev!(velocity),
                position,
            )''',
```

Finally, we need to add the data we're reading from the other agent. This also needs special handling - we'll use `agent!(Body2)` to indicate which agent we want to read from. To avoid deadlock, this reads from the most recent previous step of the other agent.

```
            'consumed': '''(
                prev!(timeStep),
                prev!(position),
                prev!(velocity),
                agent!(Body2).position,
                agent!(Body2).mass,
            )''',
```