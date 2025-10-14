from __future__ import annotations

from sqlalchemy import Column, Float, Integer, Numeric, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Track(Base):
    __tablename__ = "tracks"

    track_uri = Column("Track URI", String, primary_key=True)
    track_name = Column("Track Name", String, nullable=False)
    album_name = Column("Album Name", String, nullable=True)
    artist_names = Column("Artist Name(s)", String, nullable=True)
    release_date = Column("Release Date", String, nullable=True)
    release_year = Column("Release Year", Integer, nullable=True)
    duration_ms = Column("Duration (ms)", Numeric, nullable=True)
    popularity = Column("Popularity", Numeric, nullable=True)
    explicit = Column("Explicit", String, nullable=True)
    genres = Column("Genres", String, nullable=True)
    danceability = Column("Danceability", Float, nullable=True)
    energy = Column("Energy", Float, nullable=True)
    loudness = Column("Loudness", Float, nullable=True)
    speechiness = Column("Speechiness", Float, nullable=True)
    acousticness = Column("Acousticness", Float, nullable=True)
    instrumentalness = Column("Instrumentalness", Float, nullable=True)
    liveness = Column("Liveness", Float, nullable=True)
    valence = Column("Valence", Float, nullable=True)
    tempo = Column("Tempo", Float, nullable=True)
    time_signature = Column("Time Signature", Integer, nullable=True)
    key = Column("Key", Integer, nullable=True)
    mode = Column("Mode", Integer, nullable=True)
    search_text = Column("search_text", String, nullable=True)

    def genres_list(self) -> list[str]:
        if not self.genres:
            return []
        return [genre.strip() for genre in self.genres.split(",") if genre.strip()]
