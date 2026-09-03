import { query } from "$app/server";
import { loadLeagueData } from "#lib/server/league-data.js";

export const getLeagueData = query(loadLeagueData);
