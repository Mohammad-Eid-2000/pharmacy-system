using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmacySystem.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryStockMovements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Batches_MedicineId",
                table: "Batches");

            // Backfills existing rows with the domain default (10) rather than 0.
            // A 0 threshold would mean low-stock alerts never fire for medicines
            // that were created before this column existed.
            migrationBuilder.AddColumn<int>(
                name: "ReorderLevel",
                table: "Medicines",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<string>(
                name: "SupplierName",
                table: "Batches",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StockMovements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    MovementType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    QuantityChange = table.Column<int>(type: "int", nullable: false),
                    QuantityBefore = table.Column<int>(type: "int", nullable: false),
                    QuantityAfter = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Reference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PerformedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockMovements_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Batches_MedicineId_BatchNo",
                table: "Batches",
                columns: new[] { "MedicineId", "BatchNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_BatchId",
                table: "StockMovements",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_CreatedAt",
                table: "StockMovements",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_Batches_MedicineId_BatchNo",
                table: "Batches");

            migrationBuilder.DropColumn(
                name: "ReorderLevel",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "SupplierName",
                table: "Batches");

            migrationBuilder.CreateIndex(
                name: "IX_Batches_MedicineId",
                table: "Batches",
                column: "MedicineId");
        }
    }
}
