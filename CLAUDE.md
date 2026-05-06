# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Company Context

Ventus Labs is an **AI Agents as a Service** company — building autonomous AI agents, full-stack apps, and custom software for traders, investors, and founders. Projects span trading bots, portfolio managers, web/mobile apps, and automation tools.

**Brand:** Dark backgrounds (#0a0a0a–#111111), bold red accents (#e63939–#ff2d2d), white/gray text. Premium, confident, high-energy tech-finance aesthetic. No generic startup minimalism.

**Tone:** Direct, professional, results-focused, slightly bold/edgy.

## Coding Guidelines

### Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If something is unclear, stop and name what's confusing before implementing.
- If a simpler approach exists, say so and push back when warranted.

### Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes
- Touch only what you must. Don't improve adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove only imports/variables/functions that YOUR changes made unused.

### Goal-Driven Execution
- Transform tasks into verifiable goals before starting.
- For multi-step tasks, state a brief plan with verification steps.
- Define success criteria upfront so you can loop independently.
