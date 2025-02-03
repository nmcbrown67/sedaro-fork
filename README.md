# Sedaro Nano

The tiniest possible mockup of our system

## Goal

The goal of this mini-project is to gain a better understanding of your ability to **be creative**, **think through problems**, and **solve relevant challenges** related to the engineering roles at Sedaro. This is an opportunity for you to show off your personal strengths. Don't focus on the simple contributions and instead aim to really impress us. To best set expectations, we won't be impressed by an ability to write boilerplate or copy and paste tutorials. A submission that makes us say "Wow, that's SMART!" is far better than one that makes us say "This is really robust.". Get creative, the prompt is intentionally very open-ended.

Within the next `7` days, attempt the following mini-project and return your solution containing the full project (less anything that would be .gitignored such as `node_modules`) and any notes on how to setup and run your specific solution. As important as your solution, we are interested in understanding your thought process and your ability to clearly communicate your approach so a writeup should also be included. For the writeup, include some details on your solution, any novel or creative aspects of the solution, and what additional features or improvements you would add if you were given more time.

Please note that if you end up getting to a solution that you aren't happy with or that is a dead end, document why and we will call that good enough. Please don't invest too much time. A writeup of why a solution is insufficient and how you might approach it differently often tells us what we need to know.

If you have any questions or issues while you work through this problem or if you get stuck, please contact Bas Welsh at sebastian.welsh@sedarotech.com.

Once you have completed your solution, please follow the submission steps below.

## Setup

1. Clone this repository.
   - Please note that **only** cloning via HTTPS is supported
   - Please **do not** commit changes to any branch of this repository. If you would like to use git, you may fork this repository to create a private repo of your own
2. Ensure that Docker is installed and running. To compile and run the app, execute the following command
   - `docker compose up --build`
   - Ensure your localhost ports `3030` and `8000` are available first.
3. That's it ✅! Sedaro Nano should now be available via web browser at http://localhost:3030/. The API is running at http://localhost:8000/.
   - It may take a few moments for the container to fully come up and serve the page.
   - Changes to both the React app and the Flask app should auto reload.

### Directory Structure

```sh
.
├── README.md                 # This README
├── app                       # The backend (Python)
│   ├── app.py                # Setup + API handling
│   ├── modsim.py             # Modeling and simulation functions
│   ├── simulator.py          # Core simulation runtime
│   └── store.py              # In-memory stream data structure
├── queries                   # Query-parsing library (Rust)
│   └── src
│       ├── grammar.lalrpop   # The syntax definition
│       ├── lib.rs            # The parser library
│       └── main.rs           # A binary for using the parser
└── web                       # The frontend (React/TypeScript)
    └── src
        ├── App.tsx           # View simulation results
        └── SimulateForm.tsx  # Define a simulation
```

### Tips

- You may wish to search for `NOTE:` in the code to get situated.
- It's possible to work on parts of this repo outside of the docker containers for more rapid development

## Submission

1. Remove any temporary or .gitignored files/directories, such as `__pycache__`, `node_modules`, `target`, or any local virtual environments.
2. Include a writeup as detailed in the **Goal** section above. If relevant to your solution, please include screenshots and/or a link to a video.
3. Compress your entire `sedaro_nano` directory into a `.zip` file.
4. Email your solution to kacie.neurohr@sedarotech.com and sebastian.welsh@sedarotech.com.  Our mail server will often block submissions so we recommend sharing the .zip with us via a Google Drive link (or similar sharing service).

## Your Task

Included in this directory is a tiny mockup of Sedaro's system. Though it technically comprises a full-stack app, there are _many_ areas in which it could be improved.

**Review the files that make up Sedaro Nano, figure out how it works, and then add to it in whatever ways <u>best</u> show off your unique skills + creativity!**

### Some Project Ideas

- Simulator
  - Speed up either buildtime or runtime
  - "Compile" the query language which is currently interpreted
  - Make simulations deterministic
  - Parallelize simulation execution
  - Expand the query language
  - Expand the simulation semantics beyond simple pure functions
  - Improve the Q-Range KV Store data structure
- Web
  - Revamp the UI/UX with cool visualizations and interactivity
  - Live-stream the simulation
  - Show off your best creative work with a redesign
- App
  - Add unique patterns of user engagement
- Data
  - Create a more scalable storage solution than a JSON string in one DB row
  - Do some statistical analysis on the data
  - Set up background jobs to preprocess data
- Modeling & Simulation
  - Improve the numerical stability of the simulation functions
  - Implement additional modeling and simulation scope
  - Analyze the sensitivity to initial conditions
- Etc
  - Incorporate computational optimizations (e.g. linear programming)
- Whatever you want; these are just suggestions to get you thinking

![](./files/screenshot2.png)
