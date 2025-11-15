# Outlaw-CodeBreaker
A powerful AI tool for coding and developing apps, though not an AI itself, here is a full guide to setting it up and connecting it to an AI for FREE.
1. Install LM Studio onto a Windows PC with a decent GPU and CPU
2. Go through the setup process
3. Press the search button and search qwen3-30b-a3b-thinking-2507
4. Click on the top option and look for a little drop down menu
5. Click the drop down and select Q6_k (For GPUs with 24GB of VRAM) or Q4_k_m (For GPUs with less VRAM)
6. If you're unsure about how much VRAM your PC has, check in Task Manager (open it from the search bar nest to the start button for your PC), go to the Performance tab and select your GPU, where it will be labeled as "Dedicated GPU memory"
7. Press the download button, and it will start installing
8. Press the button in LM Studio that looks like a file, then select the settings button on the right side of the model
9. Set the Context Length to 8192 (Weaker GPUs lower it a little bit if it uses too much RAM), the GPU Offload to a little over half (28 for 24GB VRAM), and set the CPU Thread Pool size to around 8-10
10. Scroll down and set the number of experts to 10-15, enable flash attention, K Cache, and V Cache
11. Set K Cache and V Cache to Q8_0 for stronger GPUs, Q5_0 fopr weaker GPUs
12. Scroll back up to the top and press the Inference tab
13. Set the temperature to 0.7, the Repeat Penalty to 1.05, the Top P Sampling to 0.9, and the CPU Threads to 8-10
14. Press the green terminal button right above the file button, this will pull up the server screen
15. Load the model (Very top middle of the screen) and wait for it to finish loading
16. Press the little switch for the server to turn it on
17. Congrats! The hard part is over, now you can just download the files from this repository (It's fine if you already downloaded them) and open the index file, which will pull up an app in your default browser
18. Any time you need to turn it on later, you can just open LM Studio and turn the server on, all of the settings will save
19. You're now ready to begin your coding adventure! Thanks for using Outlaw CodeBreaker!
20. Just type in what you want it to build, and it will code it for you, if you don't know anything about coding, that's fine, it will do everything for you, including testing and bug fixes, and code it in html default, which can run in any browser by double clicking in the files app.
21. If you recieve a code that is split into multiple files, download them all as what they are named (IE Index.html, App.js, style.css, etc) and put them all in a new folder in your files app, then double click the main html file, usually index.html, and boom, your done!
I hope you enjoy this project, and find it useful! Please report any bugs and errors, and ask questions if you get stuck anywhere, and I or someone else will try to respond as quickly as possible. Good luck Outlaws!
