"""claude:2026-10-19T07:20:00+02:00 — Schnitt des Grim-Reach-Trailers (Chef 19.10.: 1 Minute, Musik legt der Chef an).

Liest die Clips aus mkt-1.3.0-trailer.mjs (marketing/1.3.0-media/trailer/clips), schneidet sie mit Überblendungen
auf genau 60 s und schreibt Video ohne Ton plus eine Schnittliste mit Zeitmarken für die Musik.

Aufruf (aus apps/client/):  python -I -X utf8 ui-audit/mkt-1.3.0-trailer-assemble.py
"""
import subprocess
from pathlib import Path

ROOT = Path("G:/GameDev/marketing/1.3.0-media/trailer")
CLIPS = ROOT / "clips"
OUT = ROOT / "GrimReach-Trailer-1080p30-ohne-Ton.mp4"
TOTAL = 60.0
FPS = 30

# (Clip, Einstieg s, Dauer s, Überblendung VOR diesem Clip, Beschreibung)
SEQ = [
    ("01-opening", 0.0, 4.4, None, "Hauptmenü blendet aus dem Schwarz ein (Glut, Highlands, Logo)"),
    ("02-card-reach", 0.0, 2.9, ("fadeblack", 0.4), "Tafel: THE REACH IS BROKEN. / A DARK FANTASY IDLE RPG"),
    ("03-combat", 0.0, 5.4, ("fadeblack", 0.4), "Kampf: Wreath Bearer in der Götzenhalle"),
    ("04-card-hunt", 0.0, 2.9, ("fadeblack", 0.4), "Tafel: HUNT WHAT LURKS IN THE DARK."),
    ("05-boss", 0.0, 4.9, ("fadeblack", 0.4), "Bosskampf: The Expunger"),
    ("06-mythic-find", 0.0, 4.4, ("fade", 0.4), "Mythic Find: Aegis of the Last Idol (Toast ab ~1,0 s)"),
    ("07-pet-drop", 0.0, 4.6, ("fade", 0.4), "Begleiter-Fund: Pyreling (Fenster ab ~0,8 s)"),
    ("08-card-legend", 0.0, 2.9, ("fadeblack", 0.4), "Tafel: FORGE YOUR LEGEND."),
    ("09-character", 0.0, 3.4, ("fadeblack", 0.4), "Charakter im Idol-Set, Item-Karte Last Judgement (ab ~1,0 s)"),
    ("10-woodcutting", 0.0, 2.9, ("fade", 0.4), "Holzfällen: Aktionskarten"),
    ("11a-camp-day", 0.0, 2.2, ("fade", 0.4), "New Haven bei Tag"),
    ("11b-camp-night", 0.0, 2.2, ("fade", 0.8), "New Haven bei Nacht"),
    ("12-offline", 0.0, 3.4, ("fade", 0.4), "While You Were Away (Idle-Bilanz)"),
    ("12-card-ash", 0.0, 2.9, ("fadeblack", 0.4), "Tafel: FALL INTO THE ASH."),
    ("13-cinderfall", 0.0, 8.3, ("fadeblack", 0.4), "Aschesturz: Klick, Asche-Blende, Bilanz zählt auf +89 Narben"),
    ("14-end", 0.0, None, ("fadeblack", 0.4), "Schlusskarte: Logo, A Dark Fantasy Idle RPG, AVAILABLE NOW ON STEAM"),
]


def main() -> None:
    fixed = sum(d for _, _, d, _, _ in SEQ if d is not None)
    xfades = sum(x[1] for *_, x, _ in [(a, b, c, d, e) for a, b, c, d, e in SEQ] if x)
    end_dur = round(TOTAL - fixed + xfades, 3)
    seq = [(c, i, d if d is not None else end_dur, x, t) for c, i, d, x, t in SEQ]

    args = ["ffmpeg", "-y"]
    for clip, start, dur, _, _ in seq:
        args += ["-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(CLIPS / f"{clip}.mp4")]
    parts = [f"[{k}:v]settb=AVTB,setpts=PTS-STARTPTS,fps={FPS},format=yuv420p[s{k}]" for k in range(len(seq))]
    cur = "s0"
    length = seq[0][2]
    marks = [(0.0, seq[0][0], seq[0][4])]
    for k in range(1, len(seq)):
        kind, xd = seq[k][3]
        offset = length - xd
        nxt = f"v{k}"
        parts.append(f"[{cur}][s{k}]xfade=transition={kind}:duration={xd}:offset={offset:.3f}[{nxt}]")
        marks.append((offset + xd / 2, seq[k][0], seq[k][4]))
        cur = nxt
        length = length + seq[k][2] - xd
    parts.append(f"[{cur}]fade=t=out:st={length - 1.2:.3f}:d=1.2[out]")
    args += ["-filter_complex", ";".join(parts), "-map", "[out]", "-r", str(FPS), "-c:v", "libx264", "-preset", "slow",
             "-crf", "15", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(OUT)]
    subprocess.run(args, check=True, capture_output=True)

    lines = [
        "# Grim Reach Trailer — Schnittliste",
        "",
        f"Datei: `{OUT.name}` · 1920×1080 · {FPS} fps · H.264 · **ohne Ton** · Länge {length:.1f} s",
        "",
        "Zeitmarke = Mitte der Überblendung (dort sitzt der Schnitt für die Musik).",
        "",
        "| Zeit | Szene |",
        "|---|---|",
    ]
    for t, clip, text in marks:
        lines.append(f"| {int(t // 60)}:{t % 60:05.2f} | {text} |")
    lines += ["", f"Schwarzblende am Ende ab {int((length - 1.2) // 60)}:{(length - 1.2) % 60:05.2f}.", ""]
    (ROOT / "SCHNITTLISTE.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"OK {OUT} ({length:.2f} s), Schlusskarte {end_dur:.2f} s")


if __name__ == "__main__":
    main()
