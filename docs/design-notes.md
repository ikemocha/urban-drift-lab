# Design Notes

## Direction

Urban Drift Lab is a 2D, map-like city simulation prototype.

The intended fantasy is not placing decorative buildings by hand. The city develops with its own messy market logic, while the player intervenes as a mayor, minister, or planning authority.

## Core Principles

- The city changes by itself.
- Player actions should have visible side effects.
- Data visualization is part of the fun.
- Map layers should help the player read dynamics, not just decorate the screen.
- Buildings are generated from parcel rules rather than hand-placed props.

## Current Simulation Model

The current prototype uses parcel polygons instead of a square grid.

Each parcel has:

- land use
- zoning intent
- land value
- building coverage limit
- floor area ratio limit
- road access
- station access
- park access
- traffic pressure
- pollution
- satisfaction
- optional generated building

Buildings are represented as inset polygons inside the parcel, with floors, coverage, FAR, floor area, quality, and construction year.

## Next Candidates

- Make road and parcel topology more explicit.
- Let land subdivision and consolidation happen over time.
- Add a real redevelopment decision model based on expected return.
- Split population into households, commuters, and businesses.
- Make zoning changes slower and politically costly.
- Add a more refined GSI-map-like visual language.
