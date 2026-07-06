# Claude Code Master Prompt — Synapse Content Studio

## Role

You are **Claude Fable 5 running inside Claude Code**.

Act as a world-class:

- AI engineer
- staff-level full-stack engineer
- SaaS architect
- product engineer
- prompt engineer
- security engineer
- data architect
- UX engineer
- technical product lead

Your task is to **design and integrate a production-grade module called `Content Studio` into the existing Synapse application**.

You are not building a demo, landing page, or isolated prototype.

You are extending an existing multi-tenant SaaS product intended to serve paying customers.

---

# 1. Mission

Build a new module named:

# Content Studio

Content Studio converts:

- voice notes
- AI voice interviews
- rough ideas
- user documents
- Brand DNA
- Knowledge Base content
- user-created script templates
- previously approved scripts
- manually supplied Instagram inspiration

into:

- Instagram Reels ideas
- content pillars
- weekly and monthly content plans
- complete Reel scripts
- hooks
- CTAs
- captions
- thumbnail text
- on-screen text
- production instructions
- shot plans
- B-roll suggestions
- compliance warnings
- uploaded-video intelligence
- timestamped video transcripts
- scene-by-scene content analysis
- evidence-based hypotheses about why a video performed well or poorly
- reusable Content DNA extracted from the user's uploaded videos
- approved script packages ready for the existing Video Studio

The user must remain in control.

The system must never publish automatically and must never send an unapproved script into video generation.

---

# 2. Product Goal

The user should not need to understand prompting.

The ideal workflow is:

```text
Speak or write an idea
→ AI extracts useful content ideas
→ User chooses an idea
→ AI builds a content plan or Reel scripts
→ User compares three script variants
→ User edits and approves
→ Approved script is sent to Video Studio
```

The output must sound like the user.

It must not sound like generic AI copy.

The module must learn from:

- Brand DNA
- Knowledge Base
- approved scripts
- rejected scripts
- user edits
- preferred hooks
- preferred CTAs
- preferred script templates

This is not model fine-tuning.

Implement it through:

- structured preferences
- retrieval
- approved examples
- edit history
- controlled Style Memory

---

# 3. Non-Negotiable Product Principles

Follow all of these rules:

1. Human approval is mandatory.
2. Never automatically publish content.
3. Never automatically scrape Instagram.
4. Never copy another creator's wording.
5. Use inspiration only to identify patterns.
6. User-owned data has priority over external inspiration.
7. Brand DNA must affect every generated output.
8. Knowledge Base must be used only when relevant.
9. Financial content must pass compliance checks.
10. AI scores must be labeled as estimates.
11. Every important record must belong to a workspace.
12. Every workspace must be isolated.
13. Reuse existing Synapse architecture.
14. Do not duplicate existing functionality.
15. Do not expose secrets to the client.
16. Do not hardcode one AI provider into business logic.
17. Do not hardcode exact model names throughout the codebase.
18. The module must work in mock mode without paid API keys.
19. The module must be production-oriented, maintainable, testable, and observable.
20. Do not make large rewrites unless strictly necessary.

---

# 4. Mandatory Repository Inspection

Before writing code, inspect the entire repository.

Identify:

- framework and version
- package manager
- folder structure
- routing conventions
- authentication system
- workspace and multi-tenant model
- database schema
- RLS policies
- storage architecture
- current Brand DNA implementation
- current Knowledge Base implementation
- existing project and script models
- current Video Studio workflow
- current AI provider abstractions
- current design system and UI components
- existing test setup
- logging and observability
- environment variable conventions
- current deployment assumptions

Then produce a written integration plan containing:

1. current architecture summary
2. modules that can be reused
3. missing pieces
4. integration risks
5. database changes
6. routes to add
7. services to add
8. files to add or modify
9. implementation phases
10. testing strategy
11. rollback risks
12. unresolved assumptions

Do not start implementation until this plan is complete.

Do not ask the user unnecessary questions.

When a reasonable production-grade assumption can be made safely, document it and proceed.

---

# 5. Main Navigation and Routes

Add a main navigation item:

```text
Content Studio
```

Recommended routes:

```text
/content-studio
/content-studio/ideas
/content-studio/voice
/content-studio/interview
/content-studio/templates
/content-studio/inspiration
/content-studio/intelligence
/content-studio/intelligence/new
/content-studio/intelligence/[id]
/content-studio/intelligence/content-dna
/content-studio/pillars
/content-studio/plans
/content-studio/plans/new
/content-studio/plans/[id]
/content-studio/scripts
/content-studio/scripts/[id]
/content-studio/settings
```

Adapt routes to the existing project conventions if necessary.

---

# 6. Content Studio Dashboard

The dashboard must show:

- Start Voice Session
- Add Quick Idea
- Generate Content Plan
- Create Reel Script
- Script Templates
- Inspiration Library
- Analyze Video
- Video Intelligence Library
- Recent Voice Sessions
- Recent Content Plans
- Draft Scripts
- Scripts Waiting for Approval
- Approved Scripts

Metrics:

- ideas captured
- scripts generated
- scripts approved
- active content plans
- pending reviews
- total voice-session minutes
- videos analyzed
- analyzed video minutes
- high-performing patterns discovered

Use the existing Synapse design language.

Do not introduce a disconnected visual system.

---

# 7. Input Modes

Implement four input modes.

## 7.1 Quick Text Idea

The user writes a rough thought.

Example:

```text
Dnes som riešil klienta, ktorý mal tri poistky,
ale ani jedna mu dobre nekryla výpadok príjmu.
```

AI extracts:

- main topic
- client problem
- key lesson
- target audience
- suggested goal
- suggested hook
- suggested CTA
- unanswered questions
- possible Reel formats
- 3–10 Reel ideas

The user can:

- approve
- edit
- delete
- merge
- convert to script
- add to content plan

## 7.2 Quick Voice Note

The user speaks without interruption.

The system must:

1. request microphone permission
2. record locally
3. clearly indicate recording
4. allow pause and resume
5. allow cancellation
6. allow playback before upload
7. transcribe audio
8. extract structured ideas
9. let the user decide whether to store the audio

Do not store voice recordings permanently by default.

## 7.3 Audio Upload

Allow upload of supported audio files.

Validate:

- MIME type
- file size
- duration if practical
- safe filename
- workspace ownership

## 7.4 AI Content Interview

The user has a live voice conversation with an AI content strategist.

The AI asks short and relevant follow-up questions such as:

- What happened?
- What was the biggest mistake?
- Who should see this video?
- What should the viewer learn?
- Is the goal education, trust, engagement, sales, or lead generation?
- Should this be one video or a content series?
- Is there sensitive information that must be anonymized?
- What action should the viewer take?

The AI must:

- avoid repetitive questions
- avoid long monologues
- avoid interrupting unnecessarily
- stop asking when enough information exists
- produce a structured content brief
- explicitly flag uncertainty

---

# 8. Voice Architecture

Create provider-independent abstractions.

Suggested interfaces:

```ts
export interface RealtimeVoiceProvider {
  createSessionToken(
    input: CreateRealtimeSessionInput
  ): Promise<RealtimeSessionToken>;

  createInterviewSession(
    input: InterviewSessionInput
  ): Promise<InterviewSession>;
}

export interface TranscriptionProvider {
  transcribeAudio(
    input: TranscriptionInput
  ): Promise<TranscriptionResult>;
}
```

Prepare adapters for:

- OpenAI Realtime
- asynchronous transcription
- mock realtime provider
- mock transcription provider

Do not spread provider SDK calls across routes or components.

Use server-generated ephemeral credentials for realtime sessions.

Never expose a permanent API key to the browser.

Prefer WebRTC where appropriate.

Environment variables should follow this pattern:

```env
REALTIME_VOICE_PROVIDER=openai
REALTIME_VOICE_MODEL=
TRANSCRIPTION_PROVIDER=openai
TRANSCRIPTION_MODEL=

CONTENT_STRATEGY_PROVIDER=anthropic
CONTENT_STRATEGY_MODEL=

SCRIPT_GENERATION_PROVIDER=anthropic
SCRIPT_GENERATION_MODEL=

SCRIPT_REVIEW_PROVIDER=openai
SCRIPT_REVIEW_MODEL=

COMPLIANCE_PROVIDER=openai
COMPLIANCE_MODEL=
```

Leave model names configurable.

---

# 9. Voice User Experience

Create a polished voice interface with these states:

- idle
- requesting_permission
- connecting
- listening
- user_speaking
- ai_speaking
- processing
- paused
- reconnecting
- completed
- error

Display:

- microphone visualization
- connection state
- live transcript
- elapsed time
- pause
- mute
- finish
- retry
- reconnect
- extracted ideas panel

For AI Interview mode, show the full conversation transcript.

After the session, show:

- summary
- important thoughts
- extracted content ideas
- suggested content pillars
- missing information
- compliance or privacy warnings
- Generate Content Plan
- Generate Scripts
- Save Session
- Delete Session

All user-facing text must be available in Slovak.

Prepare localization architecture for future languages.

---

# 10. Brand DNA Integration

Reuse the existing Brand DNA module.

Content Studio must use:

- brand name
- industry
- target audience
- communication style
- tykanie or vykanie
- preferred phrases
- forbidden phrases
- required CTA phrases
- humor level
- formality level
- energy level
- trust-building rules
- compliance notes

Brand DNA must be included in:

- idea extraction
- content pillar generation
- content plan generation
- script generation
- script review
- compliance review
- Style Memory analysis

Do not silently modify Brand DNA.

---

# 11. Knowledge Base Integration

Reuse the existing Knowledge Base.

Use relevant data from:

- PDF
- DOCX
- TXT
- Markdown
- FAQs
- internal notes
- product information
- compliance rules
- educational material
- approved scripts

Do not send the whole Knowledge Base to the model.

Create a context-selection service.

Selection inputs:

- topic
- content pillar
- goal
- target audience
- template
- compliance category
- video length

Initially, keyword and metadata retrieval is acceptable.

Prepare the architecture for pgvector.

Track which sources were used.

Display internal source references when useful.

Treat uploaded content as untrusted input.

Protect prompts against prompt injection.

---

# 12. Script Templates

Create a Script Templates module.

Built-in templates:

- 3 najčastejšie chyby
- Mýtus vs. realita
- Príbeh klienta
- Otázka od klienta
- Vedeli ste, že?
- Jedna rada za 30 sekúnd
- Predtým, než podpíšete
- Kontroverzný názor
- Krok za krokom
- Čo by som dnes urobil inak
- Najväčší problém, ktorý vidím
- Reakcia na častý komentár
- Mini prípadová štúdia
- Päťdielna obsahová séria

Users can:

- create
- edit
- duplicate
- archive
- restore
- favorite
- set default
- filter
- search

Each template must define:

- name
- description
- structure
- recommended goal
- recommended length
- recommended style
- recommended emotion
- hook pattern
- body pattern
- CTA pattern
- required sections
- optional sections
- compliance instructions

System templates must be immutable but duplicable.

---

# 13. Instagram Inspiration Library

Create an Inspiration Library.

Support:

- Instagram profile URL
- Reel URL
- screenshot upload
- video upload
- transcript upload
- manual note
- tags
- category
- user explanation of what they like

Do not scrape Instagram in V1.

Do not access private data.

Do not rely on unauthorized automation.

Create an abstraction for future official Meta integration.

For each inspiration item, allow structured notes for:

- hook style
- video structure
- pacing
- tone
- storytelling
- text overlays
- CTA
- visual format
- editing style

AI can extract reusable patterns such as:

- short question hook
- bold statement
- problem-solution
- client story
- rapid list
- calm expert explanation
- emotional storytelling
- direct lead-generation CTA

Hard rule for every prompt:

```text
Use inspiration only to identify structural and stylistic patterns.
Never reproduce distinctive sentences, scripts, phrasing, or creative expression.
```

---

# 14. Content Intelligence V1

Build a V1 module called:

```text
Content Intelligence
```

Its purpose is to convert user-uploaded Instagram Reels or other short-form videos into structured, searchable context for Content Studio.

This V1 must analyze only content that the user uploads or is authorized to use.

Do not scrape profiles.

Do not download arbitrary Instagram videos.

Do not bypass platform restrictions.

## 14.1 V1 User Workflow

The user can:

1. upload one video or a batch of videos
2. optionally add:
   - original title
   - publishing date
   - source URL for reference
   - content category
   - views
   - reach
   - likes
   - comments
   - shares
   - saves
   - average watch time
   - completion rate
   - follower count at publication time
3. start analysis
4. view a timestamped breakdown
5. review AI findings
6. correct the transcript or classifications
7. approve reusable patterns
8. add approved patterns to Content DNA
9. use approved findings in future content plans and scripts

The user must be able to delete the source video and all derived analysis.

## 14.2 Analysis Pipeline

Create a modular asynchronous pipeline.

Recommended sequence:

```text
Upload
→ Validate
→ Store privately
→ Read technical metadata
→ Extract audio
→ Transcribe with timestamps
→ Detect scene changes
→ Select representative frames
→ Detect on-screen text
→ Analyze image, speech, pacing, and structure
→ Combine optional performance metrics
→ Generate structured findings
→ Human review
→ Add approved patterns to Content DNA
```

Do not perform expensive work inside a single synchronous request.

Use the existing background-job architecture if one exists.

If it does not exist, introduce a small, replaceable job abstraction with clear statuses and retry behavior.

Analysis statuses:

```text
uploaded
queued
preprocessing
transcribing
analyzing_scenes
analyzing_content
generating_insights
ready_for_review
approved
failed
archived
```

## 14.3 Media Preprocessing

Create service abstractions for media processing.

Use established tools where compatible with the repository and deployment environment.

The implementation may use:

- FFmpeg for audio extraction, metadata, duration, and thumbnails
- scene-change detection through a replaceable service
- adaptive frame sampling
- OCR through a configurable provider
- asynchronous processing

Do not blindly analyze every frame.

Use an adaptive strategy based on:

- scene boundaries
- meaningful visual changes
- the first three seconds
- caption changes
- detected cuts
- selected periodic checkpoints

Preserve timestamps throughout the pipeline.

## 14.4 Provider Architecture

Create provider-independent interfaces such as:

```ts
export interface VideoUnderstandingProvider {
  analyzeVideo(
    input: VideoUnderstandingInput
  ): Promise<VideoUnderstandingResult>;
}

export interface SceneDetectionProvider {
  detectScenes(
    input: SceneDetectionInput
  ): Promise<DetectedScene[]>;
}

export interface OcrProvider {
  extractText(
    input: OcrInput
  ): Promise<OcrResult>;
}
```

Reuse the existing `TranscriptionProvider`.

Business logic must not depend directly on one multimodal model.

Support:

- configurable production provider
- mock video-understanding provider
- mock scene-detection provider
- mock OCR provider

Suggested environment-variable pattern:

```env
VIDEO_UNDERSTANDING_PROVIDER=
VIDEO_UNDERSTANDING_MODEL=
SCENE_DETECTION_PROVIDER=local
OCR_PROVIDER=
VIDEO_ANALYSIS_MAX_DURATION_SECONDS=
VIDEO_ANALYSIS_MAX_FILE_SIZE_MB=
```

Do not hardcode temporary model names into domain logic.

## 14.5 Required Analysis Output

Every analyzed video must produce structured data in five layers.

### A. Observed Facts

Only directly observed information:

- duration
- aspect ratio
- language
- full timestamped transcript
- detected scenes
- scene timestamps
- on-screen text
- approximate cut frequency
- speaker count where confidently detectable
- presence of music or sound effects
- visible format such as talking head, B-roll, interview, list, or screen recording

### B. Content Meaning

- concise summary
- topic
- target audience
- viewer problem
- core promise
- main lesson
- content pillar
- content goal
- hook
- setup
- main argument
- reveal or payoff
- CTA
- likely script template
- claims requiring verification

### C. Timeline Analysis

Create timestamped segments such as:

```text
00:00–00:02 — Hook
00:03–00:08 — Problem
00:09–00:17 — Example
00:18–00:25 — Solution
00:26–00:30 — CTA
```

Each segment should include:

- start and end time
- spoken content
- visual description
- on-screen text
- editing event
- delivery style
- segment purpose
- attention mechanism
- confidence score

### D. Creative and Retention Analysis

Analyze:

- first-frame clarity
- first-three-second hook
- curiosity gap
- specificity
- emotional tension
- storytelling structure
- pacing
- sentence length
- visual-change frequency
- caption use
- pattern interruptions
- open loops
- payoff
- trust signals
- CTA strength
- possible drop-off risks

### E. Reusable Insights

Return:

- strong patterns
- weak patterns
- reusable hook patterns
- reusable structural patterns
- pacing recommendations
- preferred duration hypothesis
- content gaps
- three ideas inspired by the structure
- recommended improvements
- suitability for future templates

Never reproduce distinctive wording from another creator.

## 14.6 Performance Analysis

The system must clearly distinguish:

```text
Observed fact
Performance metric
AI interpretation
Hypothesis
Unknown
```

Never claim that one creative element caused success.

Use wording such as:

```text
This pattern may have contributed to performance.
The available data supports this as a hypothesis, not a proven cause.
```

When performance metrics are unavailable, analyze creative quality only.

When metrics are supplied, compare videos using normalized signals such as:

- views relative to follower count
- engagement relative to reach
- saves per reach
- shares per reach
- comments per reach
- average watch-time ratio
- completion rate
- performance relative to the user's own median

Do not compare raw view counts across unrelated account sizes as if they were directly equivalent.

The UI must show the quality of available evidence:

- Low evidence
- Medium evidence
- High evidence

## 14.7 AI Scores

The system may show AI-estimated scores for:

- hook strength
- clarity
- pacing
- visual engagement
- trust
- retention potential
- CTA
- originality
- overall creative quality

Every score must be labeled:

```text
AI estimate
```

Scores must be derived from transparent heuristics and model analysis.

Do not present them as platform predictions or guaranteed outcomes.

## 14.8 Batch Analysis and Content DNA

Allow batch upload and analysis within configurable limits.

After multiple videos are approved, generate a profile-level Content DNA containing:

- dominant content pillars
- most common formats
- recurring hook structures
- typical video length
- speech pace
- visual rhythm
- CTA patterns
- strongest topics based on available metrics
- underperforming patterns
- unexplored content gaps
- approved style rules
- confidence and evidence count for each rule

Content DNA must be based only on approved analyses.

Users can:

- review each inferred rule
- approve
- edit
- reject
- deactivate
- delete

Content DNA must never silently overwrite Brand DNA.

Brand DNA defines desired identity.

Content DNA describes observed content patterns.

Keep them separate and let the user choose how both affect generation.

## 14.9 Content Studio Integration

Approved Content Intelligence findings may be used by:

- content pillar generation
- content planning
- Reel script generation
- script review
- Style Memory
- template recommendations

The generator should be able to receive context such as:

```text
Observed high-performing pattern:
Short client-problem hook followed by a concrete example.

Evidence:
7 approved videos; 5 above the account median for saves per reach.

Confidence:
Medium.
```

Do not include raw videos in normal script-generation prompts.

Retrieve only relevant approved findings.

## 14.10 Content Intelligence UI

Create:

```text
/content-studio/intelligence
```

The library should display:

- thumbnail
- title
- duration
- source type
- analysis status
- upload date
- available metrics
- evidence quality
- overall AI estimate
- approved or unapproved state

The detail page must include:

- video player
- synchronized transcript
- interactive timeline
- scene list
- observed facts
- content summary
- script structure
- creative analysis
- performance hypotheses
- scores
- source metrics
- reusable patterns
- user corrections
- approval controls
- Add to Content DNA

The user must be able to click a timeline segment and seek the video to that timestamp.

## 14.11 Content Intelligence Database

Reuse existing media or job tables where appropriate.

Create missing tables such as:

### content_video_assets

- id
- workspace_id
- uploaded_by
- title
- source_type
- source_url
- storage_path
- mime_type
- file_size_bytes
- duration_seconds
- width
- height
- status
- created_at
- updated_at

### content_video_analyses

- id
- workspace_id
- video_asset_id
- status
- language
- transcript
- summary_json
- content_structure_json
- creative_analysis_json
- reusable_insights_json
- ai_scores_json
- evidence_level
- provider_metadata_json
- error_message
- approved_at
- approved_by
- created_at
- updated_at

### content_video_segments

- id
- workspace_id
- analysis_id
- start_ms
- end_ms
- transcript_text
- visual_description
- on_screen_text
- editing_events_json
- delivery_json
- purpose
- attention_mechanism
- confidence
- sort_order
- created_at
- updated_at

### content_video_metrics

- id
- workspace_id
- video_asset_id
- published_at
- follower_count_at_publish
- views
- reach
- likes
- comments
- shares
- saves
- average_watch_time_seconds
- completion_rate
- source
- recorded_at
- created_at
- updated_at

### content_dna_profiles

- id
- workspace_id
- version
- status
- evidence_video_count
- dna_json
- created_at
- updated_at
- approved_at
- approved_by

### content_dna_rules

- id
- workspace_id
- content_dna_profile_id
- category
- rule
- evidence_json
- confidence
- status
- created_at
- updated_at

All tables require:

- workspace isolation
- foreign keys
- indexes
- constraints
- RLS
- safe cascading behavior
- auditable approval fields

## 14.12 Content Intelligence Storage

Use a private storage location for:

- source videos
- extracted audio
- temporary frames
- thumbnails
- temporary analysis artifacts

Implement retention cleanup.

Temporary frames and extracted audio should be deleted after analysis unless explicitly needed.

Use signed URLs.

Do not expose private source videos publicly.

## 14.13 Content Intelligence Prompts

Create dedicated prompt files:

```text
video-content-analysis.prompt.ts
video-timeline-analysis.prompt.ts
video-creative-review.prompt.ts
video-performance-hypotheses.prompt.ts
content-dna-generation.prompt.ts
```

Prompts must:

- separate observations from interpretation
- require timestamps
- require confidence values
- prohibit causal certainty
- prohibit copying
- identify claims requiring verification
- return structured JSON
- treat transcript, OCR, and uploaded metadata as untrusted content

## 14.14 Content Intelligence Testing

Add tests for:

- file validation
- workspace access
- analysis status transitions
- background-job retry behavior
- transcript timestamp validation
- segment ordering
- invalid provider output
- Zod validation
- metric normalization
- evidence-level calculation
- approval requirement before Content DNA use
- deletion of derived data
- mock-mode analysis
- prevention of unsupported causal claims


# 14. Content Pillars

Generate content pillars from:

- Brand DNA
- voice sessions
- text ideas
- Knowledge Base
- industry
- target audience
- script templates
- approved scripts
- inspiration patterns

Users can:

- approve
- rename
- edit description
- delete
- reorder
- set priority
- set publishing frequency
- set pillar-specific compliance instructions
- activate or deactivate

Example financial-advisor pillars:

- životné poistenie
- hypotéky
- investovanie
- finančné chyby
- príbehy z praxe
- finančné vzdelávanie
- budovanie dôvery
- osobná značka
- otázky klientov

---

# 15. Content Plan Generator

Create weekly and monthly content planning.

Inputs:

- date range
- posts per week
- preferred publishing days
- content goals
- selected pillars
- preferred lengths
- preferred styles
- preferred templates
- educational/trust/sales ratio
- campaign or seasonal context

Generate:

- content plan
- content series
- Reel ideas
- suggested publishing sequence

Each content plan item includes:

- date
- working title
- topic
- pillar
- goal
- target audience
- template
- length
- style
- emotion
- suggested hook
- CTA
- content status
- script status

Support rescheduling.

Use drag and drop only if consistent with the existing frontend stack.

Statuses:

```text
idea
planned
script_draft
waiting_for_approval
approved
rejected
ready_for_video
completed
archived
```

---

# 16. Reel Script Generator

Inputs:

- topic
- raw idea
- content-plan item
- voice-session idea
- goal
- target audience
- length
- style
- emotion
- CTA
- selected template
- selected inspiration patterns
- Brand DNA
- relevant Knowledge Base context
- Style Memory
- compliance rules

Supported goals:

- Education
- Trust building
- Lead generation
- Sales
- FAQ
- Myth busting
- Client story
- Common mistake
- Market update
- Personal brand
- Engagement
- Content series

Supported lengths:

- Short: 20–35 seconds
- Medium: 45–70 seconds
- Long: 90–180 seconds

Supported styles:

- Friendly
- Professional
- Dynamic
- Storytelling
- Conversational
- Expert
- Empathetic
- Humorous
- Direct
- Educational

Supported emotions:

- Calm
- Energetic
- Confident
- Serious
- Motivational
- Curious
- Empathetic
- Urgent

Generate three variants:

- Version A: clean professional
- Version B: storytelling
- Version C: strongest hook

---

# 17. Required Script Output

Every generated script must include:

## Strategy

- working title
- goal
- target audience
- content pillar
- recommended length
- recommended style
- recommended emotion
- selected template
- content angle
- why this angle was chosen

## Script

- hook
- setup
- main message
- key insight
- CTA
- complete spoken script

## Production Plan

- estimated duration
- scene breakdown
- recommended cuts
- on-screen text
- subtitle emphasis
- B-roll suggestions
- facial expression
- delivery instructions
- pacing notes
- pauses
- emphasized words

## Instagram Assets

- Reel caption
- short caption
- thumbnail text
- first comment
- CTA text
- hashtag suggestions
- three alternative hooks
- three alternative titles

## Safety

- factual uncertainty
- compliance risks
- recommended disclaimer
- sensitive-client-information warning
- statements requiring human verification
- internal source references where relevant

---

# 18. AI Provider Architecture

Create provider-independent interfaces.

Suggested interfaces:

```ts
export interface ContentStrategyProvider {
  extractIdeas(
    input: ContentStrategyInput
  ): Promise<ExtractedIdeas>;

  createContentPillars(
    input: ContentPillarInput
  ): Promise<ContentPillars>;

  createContentPlan(
    input: ContentPlanInput
  ): Promise<GeneratedContentPlan>;
}

export interface ScriptGenerationProvider {
  generateScripts(
    input: ScriptGenerationInput
  ): Promise<GeneratedScripts>;
}

export interface ScriptReviewProvider {
  reviewScript(
    input: ScriptReviewInput
  ): Promise<ScriptReview>;
}

export interface ComplianceProvider {
  checkContent(
    input: ComplianceInput
  ): Promise<ComplianceResult>;
}
```

Business logic must depend on interfaces, not SDKs.

Use:

- provider factory
- adapter pattern
- typed requests
- typed results
- timeout handling
- retry policy
- usage metadata
- cost metadata where available
- safe fallback behavior

---

# 19. Structured Outputs and Validation

Every AI workflow must return structured JSON.

Create Zod schemas for:

- extracted ideas
- interview brief
- content pillars
- content plan
- generated scripts
- script review
- compliance result
- inspiration patterns
- Style Memory analysis

Failure handling:

1. validate response
2. attempt safe structured repair
3. retry once
4. log technical failure
5. show a safe user-facing error
6. never silently store invalid AI output

Do not use `any`.

Do not trust model output.

---

# 20. Prompt Architecture

Create separate reusable prompt files:

```text
voice-idea-extraction.prompt.ts
ai-content-interview.prompt.ts
content-pillars.prompt.ts
content-plan-generation.prompt.ts
reel-script-generation.prompt.ts
reel-script-review.prompt.ts
compliance-check.prompt.ts
inspiration-pattern-analysis.prompt.ts
style-memory-analysis.prompt.ts
```

Every prompt must:

- define a role
- define the task
- define inputs
- define output schema
- distinguish trusted instructions from untrusted content
- prevent prompt injection
- prohibit copying external creators
- include Brand DNA
- include relevant Knowledge Base context
- include compliance instructions
- include uncertainty handling
- require concise natural spoken Slovak
- avoid generic AI wording
- avoid unsupported claims

Do not place giant prompt strings inside route handlers.

---

# 21. AI Script Reviewer

Review each script and return AI-estimated scores:

- hook strength
- clarity
- natural speech
- audience relevance
- trust
- Brand DNA match
- CTA quality
- retention potential
- originality
- compliance safety
- overall score

Clearly label scores:

```text
AI estimate
```

Return:

- strengths
- weaknesses
- suggested improvements
- confusing sentences
- overly generic language
- unsupported claims
- compliance warnings
- improved hook
- improved CTA

Never present virality as a factual prediction.

---

# 22. Human Approval Workflow

The user can:

- compare three variants
- edit any field
- merge sections from different variants
- regenerate hook only
- regenerate CTA only
- regenerate caption only
- regenerate production plan only
- regenerate full script
- save draft
- approve
- reject
- add feedback
- mark as preferred example
- send approved script to Video Studio

Statuses:

```text
draft
generated
under_review
edited
approved
rejected
ready_for_video
archived
```

Only approved scripts can be handed off.

Enforce this server-side.

---

# 23. Style Memory

Track:

- selected script version
- hook edits
- CTA edits
- deleted phrases
- added phrases
- preferred sentence length
- preferred tone
- rejected patterns
- frequently approved templates
- approved Content Intelligence patterns

Create explicit preference records.

Users must be able to:

- review learned preferences
- approve
- edit
- delete
- disable Style Memory

Do not silently turn weak inferences into permanent preferences.

Store confidence values.

Only active or approved preferences should affect generation.

---

# 24. Database Design

Reuse existing tables where appropriate.

Create only missing tables.

Recommended tables:

## content_sessions

- id
- workspace_id
- user_id
- type
- title
- status
- transcript
- summary
- extracted_data_json
- duration_seconds
- audio_storage_path
- save_audio
- created_at
- updated_at

Session types:

- quick_voice_note
- ai_interview
- text_note
- audio_upload

## content_ideas

- id
- workspace_id
- session_id
- title
- description
- key_message
- suggested_goal
- suggested_pillar_id
- suggested_template_id
- status
- source_type
- created_at
- updated_at

## script_templates

- id
- workspace_id
- name
- description
- structure_json
- recommended_goal
- recommended_length
- recommended_style
- recommended_emotion
- hook_pattern
- body_pattern
- cta_pattern
- compliance_rules
- is_system_template
- is_favorite
- is_archived
- created_at
- updated_at

## inspiration_sources

- id
- workspace_id
- type
- title
- source_url
- storage_path
- transcript
- user_notes
- extracted_patterns_json
- status
- created_at
- updated_at

Types:

- instagram_profile
- instagram_reel
- screenshot
- video_upload
- transcript
- manual_note

## content_pillars

- id
- workspace_id
- name
- description
- priority
- target_frequency
- compliance_notes
- is_active
- created_at
- updated_at

## content_plans

- id
- workspace_id
- name
- start_date
- end_date
- posts_per_week
- goals_json
- status
- generation_context_json
- created_at
- updated_at

## content_plan_items

- id
- workspace_id
- content_plan_id
- scheduled_date
- working_title
- topic
- pillar_id
- template_id
- goal
- target_audience
- length
- style
- emotion
- suggested_hook
- cta
- status
- sort_order
- created_at
- updated_at

## reel_scripts

- id
- workspace_id
- content_plan_item_id
- content_idea_id
- version_name
- strategy_json
- hook
- setup
- main_message
- key_insight
- cta
- spoken_script
- production_plan_json
- instagram_assets_json
- safety_json
- reviewer_scores_json
- reviewer_feedback_json
- status
- is_selected
- is_approved
- approved_at
- approved_by
- created_at
- updated_at

## style_preferences

- id
- workspace_id
- source_script_id
- preference_type
- preference_value
- confidence
- status
- created_at
- updated_at

All tables require:

- foreign keys
- indexes
- appropriate constraints
- timestamps
- workspace isolation
- RLS
- access policies
- safe delete behavior

Do not assume client-side filtering is security.

---

# 25. Storage

Use private storage for:

- voice recordings
- uploaded audio
- inspiration videos
- screenshots
- transcripts
- supporting files
- uploaded videos for Content Intelligence
- temporary analysis artifacts

Implement:

- signed URLs
- MIME validation
- size validation
- safe filenames
- workspace-based paths
- delete functionality
- retention rules

Voice recordings must not be permanently retained unless explicitly selected by the user.

---

# 26. Privacy, Security, and GDPR

Implement:

- explicit microphone permission
- visible recording indicator
- consent before audio storage
- delete session
- delete transcript
- delete audio
- configurable retention
- workspace access control
- server-side provider calls
- rate limiting
- approval audit log
- safe error handling
- prompt-injection protection
- output escaping
- no secrets in client bundles
- no sensitive raw data in production logs

Display this warning:

```text
Neuvádzajte mená ani identifikačné údaje klientov,
pokiaľ na to nemáte oprávnenie.
```

Provide AI-assisted anonymization.

User confirmation is mandatory before replacing original text.

---

# 27. Video Studio Handoff

After script approval, show:

```text
Send to Video Studio
```

Handoff payload:

- approved spoken script
- title
- CTA
- emotion
- delivery instructions
- estimated duration
- on-screen text
- production plan
- B-roll suggestions
- compliance status
- safety notes

Do not automatically start expensive video generation.

Require explicit confirmation.

---

# 28. Observability

Implement structured logging for:

- provider
- model
- workflow type
- latency
- retry count
- request ID
- workspace ID
- usage metadata
- estimated cost where available
- success or failure
- analyzed video duration
- media-processing stage
- evidence level

Never log:

- secrets
- full private documents
- full raw sensitive transcripts
- access tokens

Prepare for future:

- usage quotas
- billing
- provider cost comparison
- model routing

---

# 29. Testing

Add tests for:

- workspace isolation
- RLS assumptions
- Zod validation
- provider adapters
- script status transitions
- approval workflow
- handoff protection
- file validation
- prompt injection handling
- Style Memory controls
- mock mode
- invalid AI outputs
- retry behavior
- audio retention choices
- video-analysis status transitions
- timestamped segment validation
- metric normalization
- Content DNA approval controls
- deletion of derived video data

The module must be usable without paid credentials.

---

# 30. Implementation Phases

Work in these phases.

## Phase 1 — Discovery

- inspect repository
- map current architecture
- identify reusable modules
- identify risks
- propose final integration plan

## Phase 2 — Data and Domain

- database migrations
- RLS
- storage policies
- domain types
- Zod schemas
- status transitions

## Phase 3 — Core Content Studio

- dashboard
- quick text idea
- ideas list
- templates
- pillars
- inspiration library

## Phase 4 — Voice Notes

- audio recording
- audio upload
- transcription
- structured idea extraction
- privacy controls

## Phase 5 — AI Interview

- realtime session
- ephemeral credentials
- voice UI
- structured interview brief
- reconnect and fallback handling

## Phase 6 — Content Intelligence V1

- private video upload
- media preprocessing
- timestamped transcription
- scene and frame analysis
- timeline generation
- creative analysis
- optional manual metrics
- evidence-aware performance hypotheses
- batch analysis
- Content DNA review and approval

## Phase 7 — Planning and Scripts

- content plans
- script generation
- three variants
- reviewer
- compliance
- source references
- approved Content Intelligence retrieval

## Phase 8 — Approval and Learning

- edit and compare
- approval workflow
- Style Memory
- Video Studio handoff

## Phase 9 — Hardening

- tests
- security review
- performance review
- build fixes
- documentation
- mock mode verification

After every phase:

1. summarize completed work
2. list changed files
3. list unresolved items
4. run type checks
5. run tests
6. run production build
7. fix critical failures before continuing

---

# 31. Scope Boundaries

Do not implement in this task:

- unauthorized Instagram scraping
- automatic Instagram publishing
- automatic social publishing
- autonomous posting
- permanent voice cloning
- model fine-tuning
- billing
- advanced agency approval chains
- full social analytics
- scraping an entire Instagram profile
- unauthorized download of Instagram videos
- automatic import of arbitrary competitor profiles
- automatic expensive video generation

Prepare extensible architecture, but do not build these features now.

---

# 32. Required Documentation

Update or create:

- README.md
- .env.example
- architecture documentation
- database documentation
- RLS documentation
- provider documentation
- prompt documentation
- voice setup guide
- mock mode guide
- security and GDPR notes
- testing guide
- known limitations
- Content Intelligence architecture
- video-analysis provider setup
- media retention and deletion behavior
- V2 roadmap

---

# 33. Definition of Done

The task is complete only when:

- Content Studio exists in Synapse navigation.
- Quick text ideas work.
- Voice recording works.
- Audio upload works.
- Transcription works.
- AI extracts structured ideas.
- Script templates work.
- Manual Instagram inspiration works.
- Users can upload authorized short-form videos for analysis.
- Uploaded videos are processed asynchronously.
- Timestamped transcription and timeline analysis work.
- Creative analysis clearly separates facts, metrics, interpretations, and hypotheses.
- Users can manually add performance metrics.
- Batch analyses can produce a reviewable Content DNA.
- Only approved Content DNA rules affect future generation.
- Source videos and derived data can be deleted.
- Content pillars work.
- Weekly and monthly content plans work.
- Three complete Reel script variants can be generated.
- Script production assets are generated.
- AI review is displayed.
- Compliance review is displayed.
- The user can edit, approve, and reject scripts.
- Only approved scripts can be sent to Video Studio.
- Workspace isolation is enforced.
- RLS is enabled.
- Mock mode works.
- TypeScript passes.
- Tests pass.
- Production build passes.
- Setup documentation is complete.

Quality targets:

- Architecture: 97%+
- Maintainability: 97%+
- Multi-tenant readiness: 96%+
- Security baseline: 94%+
- User experience: 93%+
- AI output reliability: 93%+
- Production readiness: 93%+

---

# 34. Final Operating Instructions

Use the repository as the source of truth.

Do not fabricate existing components, schemas, or APIs.

Inspect before modifying.

Prefer small, reversible, modular changes.

Do not leave broken intermediate states.

Do not hide failures.

Do not claim completion without running validation.

When documentation and code disagree, explain the conflict and resolve it deliberately.

Start now by inspecting the repository.

Your first response must contain only:

1. Current architecture summary
2. Reusable existing components
3. Integration risks
4. Proposed database changes
5. Proposed routes and services
6. Exact implementation phases
7. Exact files you expect to add or modify
8. Open assumptions

Do not write code before presenting this plan.
