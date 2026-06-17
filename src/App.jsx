import { useState, useEffect } from "react";

function App() {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [checkedItems, setCheckedItems] = useState(() => {
    const savedData = localStorage.getItem("checkedItems");

    return savedData ? JSON.parse(savedData) : {};
  });


  useEffect(() => {
    localStorage.setItem(
      "checkedItems",
      JSON.stringify(checkedItems)
    );
  }, [checkedItems]);
  const buildings = [
    "401동",
    "402동",
    "403동",
    "404동",
    "405동",
    "406동",
    "407동",
    "408동",
    "409동",
  ];

  const deliveryData = {
    "401동": {
      lunch: 18,
      soup: 18,
      lohas: 2,
      list: [
        { id: 1, room: "101호", memo: "초인종 고장" },
        { id: 2, room: "102호", memo: "없음" },
        { id: 3, room: "203호", memo: "로하스밀" },
      ],
    },

    "402동": {
      lunch: 12,
      soup: 12,
      lohas: 1,
      list: [
        { id: 1, room: "201호", memo: "" },
        { id: 2, room: "202호", memo: "문 앞 배달" },
      ],
    },

    "409동": {
      lunch: 10,
      soup: 10,
      lohas: 10,
      list: [
        { id: 1, room: "109호", memo: "" },
        { id: 2, room: "203호", memo: "" },
        { id: 3, room: "302호", memo: "" },
        { id: 4, room: "407호", memo: "" },
        { id: 5, room: "705호", memo: "" },
        { id: 6, room: "707호", memo: "" },
        { id: 7, room: "708호", memo: "" },
        { id: 8, room: "710호", memo: "" },
        { id: 9, room: "807호", memo: "" },
        { id: 10, room: "1005호", memo: "" },
      ],
    },
  };

  const currentData = deliveryData[selectedBuilding];

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
          onClick={() => setSelectedBuilding(null)}
          style={{
            marginBottom: "20px",
          }}
        >
          ← 뒤로가기
        </button>

        <h1>{selectedBuilding}</h1>

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
            {(checkedItems[selectedBuilding] || []).length}
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
                (checkedItems[selectedBuilding] || []).includes(item.id)
                  ? "#444"
                  : "transparent",

              opacity:
                (checkedItems[selectedBuilding] || []).includes(item.id)
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
                checked={
                  (checkedItems[selectedBuilding] || []).includes(item.id)
                }
                onChange={() => {
                  const currentChecked =
                    checkedItems[selectedBuilding] || [];

                  if (currentChecked.includes(item.id)) {
                    setCheckedItems({
                      ...checkedItems,
                      [selectedBuilding]: currentChecked.filter(
                        (id) => id !== item.id
                      ),
                    });
                  } else {
                    setCheckedItems({
                      ...checkedItems,
                      [selectedBuilding]: [
                        ...currentChecked,
                        item.id,
                      ],
                    });
                  }
                }}
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
              메모 : {item.memo}
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

      {buildings.map((building) => (
        <button
          key={building}
          onClick={() => setSelectedBuilding(building)}
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