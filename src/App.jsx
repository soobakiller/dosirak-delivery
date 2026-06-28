import { useState, useEffect, useRef } from "react";
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
  const [deliveryMemo, setDeliveryMemo] = useState("");
  const [memoSaveStatus, setMemoSaveStatus] = useState("");
  const memoSaveTimer = useRef(null);



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

  function normalizeRoom(room) {
    return {
      checked: false,
      ...room,
      paused: room.paused === true,
    };
  }

  function hasRoomHighlight(item) {
    return Boolean(
      item.soupExcluded ||
      item.lohasExcluded ||
      item.specialRequest ||
      item.memo
    );
  }

  const selectedData = firebaseData[selectedBuilding] || {};
  const allRooms = [...(selectedData.rooms || [])]
    .map(normalizeRoom)
    .sort(
      (a, b) =>
        parseInt(a.room) - parseInt(b.room)
    );
  const pausedRooms = allRooms.filter((room) => room.paused);
  const currentData = {
    lunch: Math.max(
      (selectedData.lunch || 0) - pausedRooms.length,
      0
    ),
    soup: Math.max(
      (selectedData.soup || 0) -
      pausedRooms.filter(
        (room) => !room.soupExcluded
      ).length,
      0
    ),
    lohas: Math.max(
      (selectedData.lohas || 0) -
      pausedRooms.filter(
        (room) => !room.lohasExcluded
      ).length,
      0
    ),
    list: allRooms.filter((room) => !room.paused),
    allRooms,
    notice: selectedData.notice || "",
    deliveryMemo: selectedData.deliveryMemo || "",
  };
  useEffect(() => {
    setDeliveryMemo(currentData.deliveryMemo);
  }, [selectedBuilding, currentData.deliveryMemo]);

  useEffect(() => {
    return () => {
      if (memoSaveTimer.current) {
        clearTimeout(memoSaveTimer.current);
      }
    };
  }, []);

  async function toggleIssue(item) {

    const buildingNumber =
      selectedBuilding.replace("동", "");

    const rooms =
      currentData.allRooms.map((room) =>
        room.id === item.id
          ? {
            ...room,
            issue: !room.issue,
          }
          : room
      );

    await updateDoc(
      doc(db, "buildings", buildingNumber),
      { rooms }
    );
  }

  async function toggleCheck(item) {

    const buildingNumber =
      selectedBuilding.replace("동", "");

    const rooms =
      currentData.allRooms.map((room) =>
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

  function handleDeliveryMemoChange(value) {
    setDeliveryMemo(value);
    setMemoSaveStatus("저장 중...");

    if (memoSaveTimer.current) {
      clearTimeout(memoSaveTimer.current);
    }

    memoSaveTimer.current = setTimeout(async () => {
      try {
        const buildingNumber =
          selectedBuilding.replace("동", "");

        await updateDoc(
          doc(db, "buildings", buildingNumber),
          { deliveryMemo: value }
        );

        setMemoSaveStatus("자동 저장됨");
      } catch (error) {
        console.error(error);
        setMemoSaveStatus("저장 실패");
      }
    }, 600);
  }

  if (selectedBuilding) {
    return (
      <div
        style={{
          width: "min(440px, 100vw)",
          maxWidth: "440px",
          margin: "0 auto",
          padding: "20px",
          boxSizing: "border-box",
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
            boxSizing: "border-box",
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            overflowWrap: "anywhere",
            whiteSpace: "pre-line",
          }}
        >
          📢 동별 공지 : {currentData.notice}
        </div>

        <div
          style={{
            border: "1px solid gray",
            borderRadius: "10px",
            boxSizing: "border-box",
            width: "100%",
            padding: "18px",
            position: "sticky",
            top: 0,
            zIndex: 5,
            marginBottom: "20px",
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
            fontSize: "18px",
          }}
        >
          <div>🍱 도시락 : {currentData.lunch}개</div>
          <div>🥣 국 : {currentData.soup}개</div>
          <div>🌱 로하스밀 : {currentData.lohas}개</div>
        </div>

        <div
          style={{
            border: "1px solid #7c8db5",
            borderRadius: "10px",
            boxSizing: "border-box",
            width: "100%",
            padding: "14px",
            marginBottom: "20px",
            backgroundColor: "#f7f9ff",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            배달 특이사항 메모
          </label>
          <textarea
            value={deliveryMemo}
            placeholder="배달 중 확인한 특이사항을 적어주세요."
            onChange={(e) => handleDeliveryMemoChange(e.target.value)}
            style={{
              boxSizing: "border-box",
              width: "100%",
              minHeight: "90px",
              padding: "10px",
              border: "1px solid #b8c2d8",
              borderRadius: "8px",
              resize: "vertical",
              fontSize: "16px",
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              minHeight: "20px",
              marginTop: "6px",
              color:
                memoSaveStatus === "저장 실패"
                  ? "#b00020"
                  : "#526173",
              fontSize: "13px",
            }}
          >
            {memoSaveStatus}
          </div>
        </div>

        {currentData.list.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleCheck(item)}
            style={{
              position: "relative",
              width: "100%",
              border:
                item.issue
                  ? "2px solid #ef4444"
                  : hasRoomHighlight(item)
                    ? "2px solid #f59e0b"
                    : "1px solid #d1d5db",
              borderRadius: "10px",
              boxSizing: "border-box",
              height: "132px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              padding: "18px",
              marginBottom: "10px",
              fontSize: "18px",
              color:
                item.checked
                  ? "#f8fafc"
                  : "#111827",
              boxShadow:
                item.issue
                  ? "0 0 0 3px rgba(239, 68, 68, 0.14)"
                  : hasRoomHighlight(item)
                    ? "0 0 0 3px rgba(245, 158, 11, 0.14)"
                    : "none",
              cursor: "pointer",


              backgroundColor:
                item.checked
                  ? "#374151"
                  : item.issue
                    ? "#fff1f2"
                    : hasRoomHighlight(item)
                    ? "#fffacd"
                    : "#ffffff",

              opacity:
                item.checked
                  ? 0.6
                  : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                minHeight: "32px",
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "22px",
                  height: "22px",
                  accentColor: "#2563eb",
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    textDecoration:
                      item.checked
                        ? "line-through"
                        : "none",
                  }}
                >
                  {item.room}
                </h3>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleIssue(item);
                  }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid gray",
                    cursor: "pointer",
                    backgroundColor:
                      item.issue
                        ? "#ff4444"
                        : "#ffd54f",
                  }}
                >
                  ⚠️
                </button>


              </div>
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "18px",
                minWidth: 0,
                flex: 1,
                overflowY: "auto",
                overflowWrap: "anywhere",
                paddingRight: "4px",
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

              {item.issue && (
                <div>
                  🚨 관리자 확인 필요
                </div>
              )}

              {item.memo && (
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                  }}
                >
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
              fontSize: "22px",
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
