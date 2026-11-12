# Nexvia Groupe website

Single-page company site for Nexvia Groupe. Plain HTML, CSS and JavaScript: no build step and
no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Where things are

| Path            | What it holds                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`    | Page structure and the fixed text: hero messages, who we are, the Managing Director's message, contact details.                                         |
| `js/content.js` | The services, training programs and "Why Nexvia" lists. Edit the text here and the explorer, the menus, the search and the contact form all pick it up. |
| `js/main.js`    | Behaviour: header and menus, hero video, service explorer, training tabs, search, contact form.                                                         |
| `css/`          | `styles.css` (design tokens at the top) and `fonts.css`.                                                                                                |
| `assets/`       | Hero video and poster, photos, logo files and self-hosted fonts.                                                                                        |

## Hero video

`assets/video/hero-1080.mp4` plays on wide screens and `hero-720.mp4` on phones. Both are cut
from the supplied clip with the last 0.9 seconds dissolved into the first, so the loop has no
jump. `hero-poster.jpg` shows while the video loads, and stays up for visitors who ask their
device for reduced motion or data saving.

To swap in new footage, keep the same three file names. This is the command that made the
1080p loop from a 5.43 second clip (offset = length − 2 × 0.9, duration = length − 0.9):

```bash
ffmpeg -i source.mp4 -i source.mp4 -filter_complex "[0:v]trim=start=0.9,setpts=PTS-STARTPTS,fps=30,scale=-2:1080[a];[1:v]trim=end=0.9,setpts=PTS-STARTPTS,fps=30,scale=-2:1080[b];[a][b]xfade=transition=fade:duration=0.9:offset=3.6333,format=yuv420p[v]" -map "[v]" -an -c:v libx264 -crf 26 -preset slow -movflags +faststart -t 4.5333 hero-1080.mp4
```

## Contact form

The form uses Netlify Forms: messages are stored under Forms in the Netlify dashboard and
emailed on by a form notification (set the address in Netlify). If the post fails, the page
lays the message out as an email to the `contactEmail` address in `js/content.js` instead.

## Publishing

Upload the whole folder to any static host: the hosting behind `nexviagroupe.com`, Netlify,
Cloudflare Pages or GitHub Pages all work as they are. `index.html` must sit at the site root.

## Credits

- Logo, photos and hero footage: supplied by Nexvia Groupe.
- Fonts: Archivo and IBM Plex Sans / Mono, under the SIL Open Font License
  (`assets/fonts/OFL-*.txt`).
