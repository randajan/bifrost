
import React from "react";
import { createRoot } from 'react-dom/client';

import "./index.css";
import { TestBeam } from "./TestBeam";

const root = document.getElementById("root");

createRoot(root).render(<TestBeam/>);

