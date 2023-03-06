---
title: Kevin Wang - How I got started with video engineering
published_at: 2023-02-14
---

### My background

In college, I was actually studying to be a physicist, but after graduation, I couldn't find a job in that field. So, one day, I received an email from a Google recruiter and decided to follow up on it to see what would happen.

At Google, I worked primarily on front-end development, but I also worked a little bit on the data science pipeline. I realized that I really enjoyed building consumer-facing products, so I switched to Google Flights and worked on their UI and feature development. After a few years, I realized that working at a big company just wasn't for me. I liked the chaos and experimentation that comes with building a new product. So I left Google and moved to New York, where I started exploring different ideas.

One of the early ideas I explored was video. I noticed that many people said they didn't like video, but they would always be on FaceTime at night. So, I realized that video was an underserved market. As I started building video products, I realized that we needed to know more about video at a fundamental level. Most people treated video as an opaque token, but I wanted to dive deeper into understanding the underlying problems and why the components weren't working efficiently.


### So how does video/something like Zoom work?

Zoom starts with the camera having an image sensor that turns photons into color information. The sensor is square, but it gets cropped into a rectangle and the signal gets sent to the computer. However, storing red, green, and blue on a large array results in a massive amount of data, which cannot be sent over the Internet. To solve this, the first step is to compress the data and downsample it. This is done by realizing that the human eye is more sensitive to brightness changes than color changes, so the first downsampling involves reducing the color information in the video. For example, in a 1080p video, there are 1080 pixels of vertical information, but only half of that, 540 pixels, of color information.

After downsampling, compression is needed to make sure the video fits over the Internet. The compression algorithm works by discarding redundant information from adjacent frames of video, such as a background that doesn't change. The video is then packetized into smaller chunks that are numbered sequentially and sent over the network using the Real Time transport media protocol (RTP). During the process, some packets may not make it, but the WebRTC protocol which wraps RTP has information to retry the specific packet.

At the destination, the video is re-rendered on every packet, and if a packet is missing, it asks for it again. The destination has a buffer to allow the packets to write in order and start rendering frames. If the frame can be rendered before the timestamp expires, it shows up on the screen, but if not, it may be dropped.

The biggest challenge for video servers is network constraints, as video in itself, uncompressed, can result in gigabits per second of data. The biggest complication is figuring out where each packet should go and addressing it quickly. Zoom may do some compression improvements, but in practice, the biggest challenge is just routing the data.


### How does audio play into this?

Audio is treated differently from video. Audio is based on a sensor that detects pressure plate movement and converts it into a digital signal. Audio is sampled much more frequently than video, for example, Zoom samples at 44,100000 or 48,000 times per second. But, the trade-off is that audio samples have much lower data volume compared to video. As a result, audio is much easier to transmit over the Internet.

Audio and video both have a timestamp associated with them, which is governed by the system clock. When the video and audio are received, this time stamp synchronizes them. However, once produced, audio and video are completely independent data streams, except for the timestamp.

Interestingly, Google Meet prioritizes audio because people notice drops in audio more significantly than video. So, Google Meet will delay video in case of network congestion but will try to ensure that audio is delivered on time. 

This actually led us to the insight that if video was compressed more, it would be more efficient, as audio did not have this problem.


### What are the time constraints involved in real-time communication between my computer and Zoom, and then between Zoom and your computer?

Real-time video communication has to be extremely efficient. People tend to notice if the video lags beyond about 150 milliseconds. This means that the light has to hit your camera sensor, go through the Internet, undergo compression, and then be displayed on the other end within 100 milliseconds. 

This creates unique constraints on the compression algorithm. Many generic data compression algorithms look into the future to determine the entire corpus of data. But live video cannot do this because the information must be causal. You can't compress based on future information. This makes live video more complicated than something like Netflix, which can compress data more efficiently because they see the entire corpus of data.

The compression algorithm must also output the frame fast enough. The compression step usually takes around 10 milliseconds, and the capture card may introduce an additional 33 milliseconds of latency (one frame at 30 frames per second). By the time it gets to your computer, 50 milliseconds of latency have already been used.

When transmitting video over the network, only 100 milliseconds are left to send the video, receive a response, and adjust accordingly. This means that if a packet is missing, there is only one retry available. Zoom reduces the likelihood of a retry by using forward error correction, which computes and sends redundant information in the packet. 

To achieve 100-millisecond round-trip latency, Zoom must route the data quickly. If you are in Connecticut and I am in California, I would be talking to a California data center, and the data would then be routed to a New York-based Zoom interlink and displayed on your screen. This is faster because it runs over Zoom's links, not the open Internet, and there are fewer routing jumps.

The decoding side is typically very fast, with only one frame of latency, or 30 milliseconds or less, depending on the decoder. The amount of latency depends on who is receiving and processing the information.


### What is some of the work you’ve been doing to make live video broadcasting faster and more reliable?

The biggest challenge we face with live video broadcasting is the unreliable network. We can't rely on using interlinks to reduce latency because we broadcast over mobile networks, which can quickly result in 250 milliseconds of round-trip latency. To deal with this, we use forward error correction to send redundant information, which helps to reduce latency.

But our primary solution is to better compress the data. We’re willing to spend more CPU cycles on compression, even increasing the latency on the CPU, in order to be able to send less data over the network. Because cell modems tend to overheat quickly, sending more data reduces the capacity of the link, resulting in a decrease in video quality. Sending less data reduces the number of retries and improves the stability of the video players. This was something we discovered through experimentation

We’ve also found that optimizing the code and reducing the number of copies can improve the compression quality. By saving on the order of 5-10 milliseconds, we can dedicate more time towards encoding, which improves the overall compression quality. These engineering tweaks build up over time to create a broader pipeline that works.


### Unique Use Case

A lot of these engineering hacks were enabled by our unique use case. For example, Zoom doesn't want to eat up your entire CPU, because you’re usually also doing other things in your meetings, but in our case, when broadcasting, broadcasting is the only thing people do. So, this allows us to max out the CPU and run it at 150% to encode video as fast as possible. This means we can do more searching, like processing all 2 million pixels per second. 

Another difference between us and Zoom is that we can tolerate slightly higher latencies because we're broadcasting, not providing real-time video. We don't need sub-200 millisecond latencies, so we can allow for slightly more complicated solutions, such as improving the compression algorithm by looking a few seconds into the future. However, this is still different from Netflix, which can look much further into the future. It's a balance between asynchronous video like Netflix and live video like Zoom.

Video is not always about how high fidelity can you transmit every pixel on the screen, but also what is the subjective quality. For example, in Zoom meetings, people look at faces, so you can improve the compression by identifying the faces and compressing them the most. Improving the visual quality generally involves identifying what's important in a scene and compressing that the most. By carving out a niche and focusing on that niche, these improvements can be made.


### Learning Video

When I first started looking into video, I tried to build what I needed around the existing SDK’s, improve the network infrastructure, and deal with the video streams. However, I quickly realized that this approach wasn't working. There was a lack of documentation and people working in the space on how to build broadcast-quality live video. There was either video conferencing video or broadcast streaming like Netflix, but nothing in between that suited our use case.

Initially, I was using an SDK called Agora, which allowed me to build something similar to zoom. I built a web wrapper around it to make it a little easier to broadcast and more resilient. However, I soon realized that the video conferencing end was too picky and didn't allow for the balance of quality and latency that we wanted.

Then I started using GStreamer, which is a tool for piping broadcast video through different use cases and building video pipelines. Again, it was too geared towards live video and I couldn't fine-tune it as much as I wanted. Over time, I migrated to FFmpeg, which also had similar problems. 

All these libraries were either fully transcoding Netflix style video or doing complete live video, but nothing in between. 

So, I just started reading the source code of GStreamer and FFmpeg and trying to reverse engineer it and figure out why it was introducing latency or synchronization errors. One great thing about video is that it’s largely open source.

In terms of networking, I learned a lot by reading the Linux kernel documentation and just understanding the terminology. In the end, networking is just about sending zeros and ones from one end to another. I started by looking at packets and reverse-engineering them one by one. I then went to the Linux kernel and learned about binding different sockets and the terminology used. By breaking down each term into individual pieces, I was able to understand what networking does. This approach helped us make small tweaks in the future and improved the reliability of our network. However, I still haven't learned much about mobile networks and the 5G protocol.


### Other than the documentation, did you read any blog posts or watch any videos that were useful?

We asked a lot of questions on Stack Overflow, but we were in such a niche space that nobody was responding to them. So, the only solution was to go to people directly and ask them questions. Most people wouldn't have a direct answer, but some would suggest looking at a specific component to research. In the end, though, we mostly learned everything ourselves. We avoided blog posts and documentation because it just ended up being a redirection away from reading the code itself. The computer has the answer, and you will eventually find it if you just read the source code.
