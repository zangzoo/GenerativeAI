import "../styles/AlbumSidebar.css";

export default function AlbumSidebar() {
  return (
    <div className="album-sidebar">
      <div className="pin"></div>

      <div className="album-card">
        <p>My</p>
        <p>Album</p>
      </div>

      <div className="album-image-box">
        <img src="/album/img2.png" alt="" />
      </div>
    </div>
  );
}
