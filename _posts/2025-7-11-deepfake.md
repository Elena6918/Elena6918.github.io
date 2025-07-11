---
layout: post
title:  Understanding Deepfake Video Detection — From Signals to Synchrony
date: 2025-07-11
description: A literature overview (as of year 2025) of Deepfake video detection methods, combined with my personal research journey—what I explored, what I learned, and why I ultimately didn’t publish. This post aims to help newcomers grasp the field’s landscape and challenges, while offering reflections on ideas, failures, and future directions.
categories: academic
tag: research
---

## What Is a Deepfake Video?

In this post, I define a deepfake video as any audiovisual content that has been manipulated to impersonate another person. This manipulation can occur in the visual domain—such as face swapping, reenactment, or model-based synthesis—or in the audio domain, via text-to-speech (TTS) voice cloning or voice conversion.

While deepfakes can be entertaining or artistic, the real concern arises when they’re used for impersonation, misinformation, or character assassination. This raises an urgent need for detection methods that are both effective and generalizable.

<br>

## A Quick Guide: What You'll Find in This Post

This post is both a literature review and a personal research narrative. If you're new to deepfake detection or want to skip to what’s most relevant, here’s a quick roadmap:

- **[Unimodal Detection](#unimodal-deepfake-detection)** — Audio or video-based only
- **[Temporal Modeling](#temporal-modeling-in-deepfake-detection)** — Consistency across time
- **[Audio-Visual Detection](#revisiting-audio-visual-deepfake-detection)** — Synchrony, fusion, and biometric alignment
- **[My Research Reflections](#reflections-on-my-own-experiments)** — What I tried, what failed, and where I see promise
- **[Final Thoughts](#final-thoughts)** — What might actually give defenders an edge

<br>

## Unimodal Deepfake Detection

### Video-Based Detection

Early deepfake detectors emerged from digital forensics, targeting signals that generative models typically fail to capture—like physiological cues and geometric constraints.

Examples include:

- [Eye-blinking patterns](https://ieeexplore.ieee.org/document/9072088)
- [Heart rate estimation from face](https://arxiv.org/abs/2110.15561)
- [Landmark geometry inconsistencies](https://ieeexplore.ieee.org/document/9465076)

As deepfakes got better, frame-level forensic detectors appeared, followed by models analyzing **motion** across frames, such as [optical flow](https://ieeexplore.ieee.org/document/9022558) or [temporal consistency](https://arxiv.org/abs/2109.01860).

<br>

### Audio-Based Detection

Audio deepfakes introduce their own telltale traces, either in signal properties or in the way they’re generated.

Approaches include:

- [Frequency-based methods](https://arxiv.org/abs/2009.01934) like bispectral analysis
- [Breathing pattern analysis](https://arxiv.org/abs/2404.15143v2)
- [Liveness testing via challenge-response](https://arxiv.org/abs/2402.18085)
- [Embedding-based classifiers](https://arxiv.org/abs/2308.14970)
- [Vocoder fingerprinting](https://arxiv.org/abs/2304.13085)

<br>

## Temporal Modeling in Deepfake Detection

Another key axis for classification is **temporal modeling**. Even high-quality fakes often fail to maintain consistency across frames.

Temporal methods fall into two groups:

- **Artifact-focused**: Detect generation noise or device-specific patterns.
- **Identity-focused**: Track how personal characteristics evolve over time.

<br>

### Artifact-Focused Temporal Modeling

These models detect inconsistencies from compression or camera-specific signals:

- [Video compression artifacts](https://arxiv.org/abs/2506.20548)
- [Camera model noise patterns](https://arxiv.org/abs/2310.20621)

A standout method is [TI²Net](https://ieeexplore.ieee.org/document/10030936), which compares face-identity embeddings over time. Using a recurrent model and triplet loss, it learns to spot identity fluctuations between frames—something that shouldn’t happen in real footage.

<br>

### Identity-Focused Temporal Modeling

These methods track stable identity traits and compare them across time or against a reference.

- [ID-Reveal](https://ieeexplore.ieee.org/document/9710044): Uses 3DMM geometry and GAN-based learning for speaker-dependent verification.
- [Appearance + Behavior decomposition](https://arxiv.org/abs/2004.14491): Separates visual identity from motion patterns like facial expressions and head pose.

These models often work best with speaker-specific reference videos and build strong personalized detectors.

<br>

## Revisiting Audio-Visual Deepfake Detection

Let’s now focus on the intersection of audio and video --- the most promising and complex area in detection (in my opinion).

Audio-visual deepfake detectors leverage the synchrony between speech and visual appearance. Depending on how features are extracted and compared, they fall into three broad categories:

<br>

### 1. Synchronization-Based Methods (Low-Level)

These methods focus purely on timing: does the mouth move when the voice says something?

- [Self-Supervised Video Forensics](https://arxiv.org/abs/2301.01767): Measures delay between phoneme onsets and lip movement.
- [Joint AV Deepfake Detection](https://ieeexplore.ieee.org/document/9710387): Trains modality-specific detectors, then aligns them using attention mechanisms.

They’re fast but don’t model speaker traits or expression dynamics.

<br>

### 2. Fusion-Based Methods (Low to High-Level)

These models fuse audio and video features into a joint representation using neural networks, usually guided by contrastive loss.

**Low-level fusion** (timing + surface-level correlation):

- [Not Made for Each Other](https://arxiv.org/abs/2005.14405)
- [Joint AV Attention with Contrastive Learning](https://dl.acm.org/doi/10.1145/3625100)

**Mid- to high-level fusion** (emotion, identity, semantics):

- [Emotions Don’t Lie](https://arxiv.org/abs/2003.06711): Cross-checks emotion consistency across modalities.
- [Voice-Face Homogeneity](https://arxiv.org/abs/2203.02195): Uses contrastive loss to align speaker identity from voice and face.

Fusion models are powerful but less interpretable than synchronization models.

<br>

### 3. Cross-Modal Biometric Matching

Here, the goal is to determine: does this face belong to this voice?

- [Speech2Face](https://arxiv.org/abs/1905.09773) and [Seeing Voices](https://arxiv.org/abs/1804.00326): Show that voice and face carry latent demographic information.
- [Voice-Face Homogeneity Tells Deepfake](https://arxiv.org/abs/2203.02195): Builds on this to detect mismatches in fakes.

These models work well in identity verification settings but may struggle with unknown speakers.

<br>

## What Contrastive Learning Actually Learns

Contrastive loss is everywhere --- but what does it *actually* align?

Depending on the dataset, architecture, and training signals, the model might be learning any of the following:

- Emotional consistency (e.g., smiles with happy tone)
- Identity-related traits (e.g., facial structure ↔ timbre)
- Timing (e.g., lip closures and consonants)
- Vocal tract constraints (e.g., shape → formants)

Most fusion-based approaches mentioned earlier implicitly assume at least one of these correlations—or try to capture them in a data-driven way. Some methods explicitly focus on the first three (emotion, identity, timing), while others attempt to unpack the final one: anatomical alignment.

For example:

- [AV Articulatory Learning](https://dl.acm.org/doi/10.1016/j.cviu.2024.104133): Trains on vocal tract variables and lip motion.
- [Who Are You](https://www.usenix.org/conference/usenixsecurity22/presentation/blue): Reconstructs vocal tract from audio as a biometric.

These ideas were a major inspiration for my own experiments. Even though my approach didn't work out as hoped, it shaped how I think about what contrastive learning might actually be encoding, and what makes some of these signals easier to fake than others.

<br>

## Reflections on My Own Experiments
---

### My Hypothesis

Inspired by the articulatory literature, I tried to learn a **joint representation** from audio and visual **motion features**—mel-spectrogram deltas and optical flow.

I thought: instead of high-level semantics or identity, maybe we can just track movement synchrony --- speech-induced motion --- between lips and voice.

### What Went Wrong

The model didn’t learn a joint space. Each modality formed its own subspace, and synchronization cues weren’t shared.  The representation was not truly joint, likely because the design lacked an objective to encourage **mutual dependence** or **cross-modal supervision**. Therefore, there was no incentive to use one modality to help interpret the other.

Further down the path, I also experimented with two additional tasks:

1. **Cross-modal reconstruction** — using audio to reconstruct video features, or vice versa  
2. **Motion-based segment matching** — determining whether a given audio snippet corresponds to a visual motion segment

Both attempts failed, likely due to the limitations of using a small, general-purpose audio-visual dataset. For example, the same event label (like “bell ring”) can appear with vastly different sounds and visual contexts, making it hard for the model to learn consistent cross-modal correspondences.

In hindsight, this line of work is more aligned with **audio-visual event localization**, where aligning semantics across modalities is already known to be challenging.

Moreover, cross-modal reconstruction may simply be too difficult on general datasets. While audio and visual motion in speech are tightly correlated due to shared underlying articulatory dynamics, general events lack that structure. Learning robust semantic representations in this setting would likely require much larger datasets with many instances per class—otherwise, the model risks overfitting or collapsing into shortcut features.


<br>

### Ideas I Didn't Pursue (but Still Like)

**1. Speaking Style Modeling**

Instead of phoneme-level synchrony, model **speaking style** over longer clips—5 to 10 seconds.

- Temporal rhythm, prosody, gesture intensity
- Contrastive learning could group similar styles together
- May reveal differences that deepfakes can’t mimic

**2. Vocal Tract Biometrics**

Inspired by [SAFARI](https://dl.acm.org/doi/10.1145/3658644.3670358), I imagined disentangling speaker physiology from speech content:

- Stable: vocal tract shape, articulation range
- Variable: phoneme identity, intonation

If we can extract a **constant vocal tract representation**, we could match that across time—even as phonemes change. This would be extremely hard for generative models to fake convincingly.

<br>

## Final Thoughts

Deepfake detection is an arms race—but not a symmetric one. Defenders can exploit asymmetries that attackers can't easily overcome.

One such asymmetry is **data**. Identity-based detectors can rely on reference samples unavailable to the attacker. Another is **physiology**—deeply individual constraints that are hard to generate but easier to verify.

Until policy, law, and society catch up, technical defenses are our first line. Ensemble systems, some modeling artifacts, others modeling synchrony or biometrics—offer layered protection.

And they serve another role: helping people prove that a real video wasn’t fake, or vice versa. In a world where doubt can be weaponized, robust detection isn’t just technical infrastructure --- it’s social infrastructure.

