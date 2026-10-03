"use client";

import { Room, RoomEvent, Track, type Participant, type Track as LiveTrack } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

function VideoTile({ track, label, muted = false }: { track: LiveTrack; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track]);
  return <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#17201b]"><video ref={ref} autoPlay playsInline muted={muted} className="size-full object-cover"/><span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm text-white">{label}</span></div>;
}

function participantLabel(participant: Participant) {
  return participant.name || (participant.identity.length > 12 ? "Participante" : participant.identity);
}

export function LiveCall({ sessionId }: { sessionId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [localCamera, setLocalCamera] = useState<LiveTrack | null>(null);
  const [remoteTracks, setRemoteTracks] = useState<Array<{ track: LiveTrack; label: string }>>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(true);
  const [microphone, setMicrophone] = useState(true);
  const [message, setMessage] = useState("");
  const roomRef = useRef<Room | null>(null);

  const join = useCallback(async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/teleconsulta/${sessionId}/token`, { method: "POST", cache: "no-store" });
      const payload = await response.json() as { serverUrl?: string; participantToken?: string; error?: string };
      if (!response.ok || !payload.serverUrl || !payload.participantToken) throw new Error(payload.error ?? "join_failed");
      const connection = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = connection;
      connection.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Video) setRemoteTracks((current) => [...current.filter((item) => item.track.sid !== track.sid), { track, label: participantLabel(participant) }]);
      });
      connection.on(RoomEvent.TrackUnsubscribed, (track) => setRemoteTracks((current) => current.filter((item) => item.track.sid !== track.sid)));
      connection.on(RoomEvent.ParticipantDisconnected, (participant) => setRemoteTracks((current) => current.filter((item) => item.label !== participantLabel(participant))));
      connection.on(RoomEvent.Disconnected, () => { setConnected(false); setRemoteTracks([]); });
      await connection.connect(payload.serverUrl, payload.participantToken);
      await connection.localParticipant.setCameraEnabled(true);
      await connection.localParticipant.setMicrophoneEnabled(true);
      const publication = connection.localParticipant.getTrackPublication(Track.Source.Camera);
      setLocalCamera(publication?.track ?? null);
      for (const participant of connection.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
          if (publication.track?.kind === Track.Kind.Video) setRemoteTracks((current) => [...current, { track: publication.track!, label: participantLabel(participant) }]);
        }
      }
      setRoom(connection); setConnected(true);
    } catch (error) {
      const code = error instanceof Error ? error.message : "join_failed";
      setMessage(code === "terms_required" ? "Leia e aceite o TCLE vigente para entrar." : code === "session_unavailable" ? "A janela de entrada desta consulta encerrou." : "Não foi possível conectar. Verifique a conexão e os dispositivos ou fale com o consultório.");
      roomRef.current?.disconnect(); roomRef.current = null;
    } finally { setBusy(false); }
  }, [sessionId]);

  useEffect(() => () => { roomRef.current?.disconnect(); }, []);

  async function toggleCamera() {
    if (!room) return;
    const enabled = !camera;
    await room.localParticipant.setCameraEnabled(enabled);
    setCamera(enabled);
    setLocalCamera(enabled ? room.localParticipant.getTrackPublication(Track.Source.Camera)?.track ?? null : null);
  }
  async function toggleMicrophone() {
    if (!room) return;
    const enabled = !microphone;
    await room.localParticipant.setMicrophoneEnabled(enabled); setMicrophone(enabled);
  }
  function leave() { room?.disconnect(); setRoom(null); roomRef.current = null; setConnected(false); setLocalCamera(null); setRemoteTracks([]); }

  if (!connected) return <section className="card mt-6"><h2 className="section-title">Entrar na sala de vídeo</h2><p className="mt-2 text-sm text-muted">Seu navegador pedirá acesso à câmera e ao microfone. A chamada não é gravada por este aplicativo.</p>{message && <p className="notice-error mt-4" role="alert">{message}</p>}<button type="button" className="action-primary mt-5" disabled={busy} onClick={join}>{busy ? "Conectando…" : "Testar dispositivos e entrar"}</button></section>;
  return <section className="mt-6 space-y-4" aria-label="Teleconsulta"><div className="grid gap-3 md:grid-cols-2">{localCamera ? <VideoTile track={localCamera} label="Você" muted/> : <div className="relative aspect-video rounded-2xl bg-[#17201b] p-4 text-white">Sua câmera está desligada.</div>}{remoteTracks.map(({ track, label }) => <VideoTile key={track.sid} track={track} label={label}/>)}</div><div className="flex flex-wrap gap-3"><button className="action-secondary" type="button" onClick={toggleMicrophone}>{microphone ? "Desativar microfone" : "Ativar microfone"}</button><button className="action-secondary" type="button" onClick={toggleCamera}>{camera ? "Desativar câmera" : "Ativar câmera"}</button><button className="action-secondary text-danger" type="button" onClick={leave}>Sair da consulta</button></div></section>;
}
