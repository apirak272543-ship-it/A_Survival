# Minecraft PE historical research — source log

## Scope
This is a non-executing, static-analysis study for A_Survival. We will not redistribute Minecraft APKs, extract or ship Minecraft assets, or copy branding/code. Any archive item whose rights are unclear is treated as a research sample only, not as a legally cleared dependency.

## Verified web sources

1. **Pocket Edition Alpha — Minecraft Wiki**  
   URL: https://minecraft.wiki/w/Pocket_Edition_Alpha  
   Browser-verified facts: Pocket Edition Alpha began with v0.1.0 on 2011-08-16, ended with v0.16.2 in November 2016, and was followed by Pocket Edition 1.0.0 in December 2016. The page lists the historical version family including v0.7.6, v0.8.0, v0.9.0 and v0.10.0.

2. **Pocket Edition v0.8.0 alpha — Minecraft Wiki**  
   URL: https://minecraft.wiki/w/Pocket_Edition_v0.8.0_alpha  
   Browser-verified facts: v0.8.0 alpha released 2013-12-12; the page records additions across blocks, items, gameplay and general changes, and exposes Android ABI/build metadata in the infobox. This is a useful feature-history reference, not a source for copying assets.

3. **Minecraft Pocket Edition 0.9.0 — Internet Archive**  
   URL: https://archive.org/details/minecraft-pocket-edition-0.9.0  
   Browser-verified facts: the item exposes an APK download named `Minecraft - Pocket Edition-0.9.0.apk`, item size about 14.2M, uploaded 2023-08-12 by a user account. Its page labels the item Public Domain Mark 1.0, but that is uploader/item metadata and is not independently sufficient to establish Mojang/Microsoft redistribution rights. Do not treat that label as a license for project use.

4. **Minecraft Pocket Edition Archive Project 0.8.0 — Internet Archive**  
   URL: https://archive.org/details/minecraftpocketeditionarchiveproject0.8.0  
   Browser-verified facts: the item is an archive/mods item uploaded 2020-02-12, about 5.0M, and exposes `Mods.zip`, not a clearly identified APK. It is relevant for historical packaging/mod context but requires rights verification before using any file.

## Research boundary
The analysis will focus on neutral engineering observations: APK layout, native libraries/ABI, resource packaging, texture resolution/format, input/HUD approach, chunk or region/world-generation clues, and performance trade-offs. We will prefer official documentation and historical wiki descriptions for conclusions, and label archive-derived observations as sample-specific. No APK will be executed; downloaded samples, if used, remain outside the repository and will be hashed.

5. **Microsoft Learn — Introduction to Resource Packs**  
   URL: https://learn.microsoft.com/en-us/minecraft/creator/documents/resourcepack?view=minecraft-bedrock-stable  
   Browser-verified facts: a resource pack is a folder structure for custom models, sounds, textures and other content. A manifest identifies the pack with description, name, UUID, version and minimum engine version; the document describes header/modules sections. It also documents pack stacking: later-applied content with the same name overwrites earlier content. This is the official modern reference that validates the architecture direction, while A_Survival uses its own namespace and IDs.

6. **Microsoft Learn — Improving performance and resource usage**  
   URL: https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/improvingperformanceandresourceusage?view=minecraft-bedrock-stable  
   Browser-verified facts: texture memory is determined by dimensions after loading, not merely compressed disk size; the article gives 256x256 vs 1024x1024 as a 16x memory factor. It recommends avoiding wasted texture space, using atlases for many small frequently used textures, manually created atlases up to 2048x2048, and platform-specific subpacks for different resolutions. These are principles, not permission to copy Minecraft assets.

## Local sample evidence
- `/home/ubuntu/a_survival_audit/mcpe_samples/mcpe-0.9.0.apk` — SHA-256 `9e85ce4c4fb4aad8828f111761197021a91f09755ef96568be5de9050c9b8942`; 15M APK, archive item metadata says 0.9.0.
- `/home/ubuntu/a_survival_audit/mcpe_samples/mcpe-0.16.0.5.apk` — SHA-256 `ab8d4076b9a944a06d2a7862ffc603768e215aef33521db4f69d33016e5c1cc6`; 53M APK, archive item metadata says 0.16.0.5.
- Both samples were extracted and inspected statically. No APK, DEX or native library was executed.

7. **Minecraft PE Alpha 0.9.0 build 1 — Internet Archive**  
   URL: https://archive.org/details/pe-a-0.9.0-build-1-armv-7-hc  
   Browser-verified facts: the item describes Android Honeycomb ARMv7 build 1, exposes `PE-a0.9.0-build1-armv7-hc.apk`, item size about 9.8M, and is attributed in the archive metadata to Mojang. Static `aapt` output for the downloaded sample reports package `com.mojang.minecraftpe`, version `0.9.0`, min SDK 11, target SDK 11, landscape feature, and `armeabi-v7a`. The sample SHA-256 is `e2136f4fd73859b50b6b2ae69c25c1d4ad4b1b96c99064b9415dee775aeb6e9e`.

## Sample-quality note
The other downloaded item `mcpe-0.9.0.apk` has package `com.mojang.minecraftpf` and decoded manifest metadata from AppCloner, so it is not treated as a clean original build for architectural conclusions. The 0.9.0 build 1 sample and the 0.16.0.5 sample are the primary comparison pair.
