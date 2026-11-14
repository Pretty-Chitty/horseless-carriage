# Horseless Carriage

A digital implementation of [Splotter Spellen's](https://www.splotter.nl/) **Horseless Carriage**, designed by **Jeroen Doumen** and **Joris Wiersinga**. It is set in the first years of the automobile. You run a car company: research new technology, lay out a factory tile by tile, and sell to a public whose tastes keep shifting. Today they want safe cars; next year safety is taken for granted and they want style. This project brings it to the browser.

## Play the Demo

**[▶ Play a demo at prettychitty.com](https://prettychitty.com/player/game/HorselessCarriage/demo)**

The demo runs in your browser, with no install and no account. It includes a narrated tutorial that teaches the game over two years of play against two AI rivals. Both the full game and the introductory rules (cars only, no trucks or sports cars) are available for 3–5 players.

Play real people on [Discord](https://discord.gg/29BjuqWCX)

## Development

```bash
# Install dependencies
yarn install

# Start local dev server
yarn start

# Build for production
yarn build

# Deploy
yarn deploy
```

### Tutorial

The tutorial script lives in `src/tutorial/`. Its narration is recorded with a local Voicebox server (Kokoro `am_michael`) and aligned with WhisperX. See [TUTORIAL.md](TUTORIAL.md) for details.

```bash
yarn tutorial:check   # rule coverage + four replays of the scripted game
yarn tutorial:audio   # re-record any step whose text changed
```

### Project documents

- [RULES.md](RULES.md): the rules spec this port implements, with its open questions
- [AUDIT.md](AUDIT.md): each rule mapped to the code that enforces it
- [LAYOUT.md](LAYOUT.md): how the table is laid out
- [ASSETS.md](ASSETS.md): where each piece of art comes from and how it is cut
- [TUTORIAL.md](TUTORIAL.md): the tutorial outline and narration pipeline

## Built with Pretty Chitty

This game is built on [**Pretty Chitty**](https://prettychitty.com/) (`@pretty-chitty/core`), a TypeScript game engine for board and card games. Pretty Chitty handles the rendering, layout, networking, and chit-pushing plumbing for async board games.

## Credits

### Original Game

- **Publisher:** [Splotter Spellen](https://www.splotter.nl/)
- **Designers:** Jeroen Doumen & Joris Wiersinga
- **Graphic Design & Illustration:** Jan Lipiński

This is a fan implementation, made with deep respect for the original. Buy [the physical game](https://www.splottershop.com/products/horseless-carriage); it deserves your shelf space.

### Implementation

- **Code & Digital Adaptation:** Josh Breckman
- **Engine:** [Pretty Chitty](https://prettychitty.com/)
- **Art sources:** scans of the physical game, and the community [Tabletop Simulator mod](https://steamcommunity.com/sharedfiles/filedetails/?id=3204177049) (see [ASSETS.md](ASSETS.md))
- **Fonts:** [Roboto Slab](https://fonts.google.com/specimen/Roboto+Slab) and [Quicksand](https://fonts.google.com/specimen/Quicksand) (SIL Open Font License)
- **Tutorial voice:** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0)

## License

Code: Custom license (see [LICENSE](LICENSE)). It is free for non-commercial use with copyleft, and Licensed Publishers may use it to promote their physical games. Game design, artwork, and trademarks remain the property of Splotter Spellen and the original creators.
