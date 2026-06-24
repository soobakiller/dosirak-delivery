import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

function App() {
  const [firebaseData, setFirebaseData] = useState({});
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [hiddenBuildings, setHiddenBuildings] = useState([]);



  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "notice", "all"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGlobalNotice(docSnap.data().message);
        }
      }
    );

    return () => unsubscribe();
  }, []);
  useEffect(() => {

    const unsubscribeList = [];

    buildings.forEach((building) => {

      const buildingId =
        building.replace("동", "");

      const unsubscribe = onSnapshot(
        doc(db, "buildings", buildingId),
        (docSnap) => {

          if (docSnap.exists()) {

            setFirebaseData((prev) => ({
              ...prev,
              [`${buildingId}동`]:
                docSnap.data(),
            }));
          }
        }
      );

      unsubscribeList.push(unsubscribe);
    });

    return () => {
      unsubscribeList.forEach(
        (fn) => fn()
      );
    };

  }, [buildings]);

  useEffect(() => {

    const unsubscribe = onSnapshot(
      doc(db, "settings", "buildings"),
      (docSnap) => {

        if (docSnap.exists()) {

          setBuildings(
            (docSnap.data().list || []).map(
              (b) => `${b}동`
            )
          );
        }
      }
    );

    return () => unsubscribe();

  }, []);

  useEffect(() => {

    const unsubscribe = onSnapshot(
      doc(db, "settings", "buildingHidden"),
      (docSnap) => {

        if (docSnap.exists()) {

          setHiddenBuildings(
            docSnap.data().hidden || []
          );
        }
      }
    );

    return () => unsubscribe();

  }, []);


  useEffect(() => {

    window.history.replaceState(
      { home: true },
      ""
    );

    const handlePopState = () => {



      setSelectedBuilding(null);
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };

  }, []);

  console.log(firebaseData[selectedBuilding]);

  const currentData = {
    lunch: firebaseData[selectedBuilding]?.lunch || 0,
    soup: firebaseData[selectedBuilding]?.soup || 0,
    lohas: firebaseData[selectedBuilding]?.lohas || 0,
    list: [...(firebaseData[selectedBuilding]?.rooms || [])]
      .sort(
        (a, b) =>
          parseInt(a.room) - parseInt(b.room)
      ),
    notice: firebaseData[selectedBuilding]?.notice || "",
  };

  async function toggleCheck(item) {
    const buildingNumber =
      selectedBuilding.replace("동", "");

    const rooms =
      currentData.list.map((room) =>
        room.id === item.id
          ? {
            ...room,
            checked: !room.checked,
          }
          : room
      );

    await updateDoc(
      doc(db, "buildings", buildingNumber),
      { rooms }
    );
  }

  if (selectedBuilding) {
    return (
      <div
        style={{
          maxWidth: "400px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        <button
          onClick={() => {

            window.history.back();

          }}
          style={{
            marginBottom: "20px",
          }}
        >
          ← 뒤로가기
        </button>

        <h1>{selectedBuilding}</h1>
        <div
          style={{
            border: "1px solid #666",
            borderRadius: "10px",
            padding: "10px",
            marginBottom: "20px",
            whiteSpace: "pre-line",
          }}
        >
          📢 동별 공지 : {currentData.notice}
        </div>

        <div
          style={{
            border: "1px solid gray",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "20px",
          }}
        >
          <div>🍱 도시락 : {currentData.lunch}개</div>
          <div>🥣 국 : {currentData.soup}개</div>
          <div>🌱 로하스밀 : {currentData.lohas}개</div>
          <div>
            진행률 :
            {
              currentData.list.filter(
                (room) => room.checked
              ).length
            }
            /
            {currentData.list.length}
          </div>
        </div>

        {currentData.list.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid gray",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "10px",

              backgroundColor:
                item.checked
                  ? "#444"
                  : (
                    item.soupExcluded ||
                    item.lohasExcluded ||
                    item.specialRequest ||
                    item.memo
                  )
                    ? "#fffacd"
                    : "transparent",

              opacity:
                item.checked
                  ? 0.6
                  : 1,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item)}
              />

              <h3
                style={{
                  margin: 0,
                }}
              >
                {item.room}
              </h3>
            </label>

            <div
              style={{
                marginTop: "10px",
              }}
            >

              {item.soupExcluded && (
                <div>🥣 국X</div>
              )}

              {item.lohasExcluded && (
                <div>🌱 로하스밀X</div>
              )}

              {item.specialRequest && (
                <div>
                  🍱 {item.specialRequest}
                </div>
              )}

              {item.memo && (
                <div>
                  📝 {item.memo}
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "clamp(24px, 5vw, 36px)",
          marginBottom: "30px",
        }}
      >
        🍱 도시락 배달 봉사
      </h1>

      <div
        style={{
          border: "1px solid orange",
          borderRadius: "10px",
          padding: "10px",
          marginBottom: "20px",
          whiteSpace: "pre-line",
        }}
      >
        📢 공지 : {globalNotice}
      </div>

      {buildings
        .filter(
          (building) =>
            !hiddenBuildings.includes(
              building.replace("동", "")
            )
        )
        .map((building) => (
          <button
            key={building}
            onClick={() => {

              window.history.pushState(
                { building },
                ""
              );

              setSelectedBuilding(building);
            }}
            style={{
              width: "100%",
              height: "60px",
              marginBottom: "10px",
              fontSize: "20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            {building}
          </button>
        ))}
    </div>
  );
}

export default App;