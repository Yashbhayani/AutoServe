import type {ServiceRequest} from "../types";
import {Timeline} from "./ui";
export function ActivityHistory({req}:{req:ServiceRequest}){return <Timeline items={[...req.timeline].reverse()}/>;}
